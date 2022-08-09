import { useEffect, useState } from "react";
import styled from "styled-components";
import confetti from "canvas-confetti";
import * as anchor from "@project-serum/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { GatewayProvider } from '@civic/solana-gateway-react';
import Countdown from "react-countdown";
import { Snackbar, Paper, Chip } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import { AlertState, getAtaForMint, toDate } from './utils';
import { MintButton } from './MintButton';
import { MultiMintButton } from './MultiMintButton';
import {
    CandyMachineAccount,
    awaitTransactionSignatureConfirmation,
    getCandyMachineState,
    mintOneToken,
    mintMultipleToken,
    CANDY_MACHINE_PROGRAM,
} from "./candy-machine";

const cluster = process.env.REACT_APP_SOLANA_NETWORK!.toString();
const decimals = process.env.REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS ? +process.env.REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS!.toString() : 9;
const splTokenName = process.env.REACT_APP_SPL_TOKEN_TO_MINT_NAME ? process.env.REACT_APP_SPL_TOKEN_TO_MINT_NAME.toString() : "TOKEN";

const WalletContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: right;
`;

const WalletAmount = styled.div`
    color: black;
    width: auto;
    padding: 5px 5px 5px 16px;
    min-width: 48px;
    min-height: auto;
    border-radius: 22px;
    background-color: var(--main-text-color);
    box-shadow: 0px 3px 5px -1px rgb(0 0 0 / 20%), 0px 6px 10px 0px rgb(0 0 0 / 14%), 0px 1px 18px 0px rgb(0 0 0 / 12%);
    box-sizing: border-box;
    transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, border 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    font-weight: 500;
    line-height: 1.75;
    text-transform: uppercase;
    border: 0;
    margin: 0;
    display: inline-flex;
    outline: 0;
    position: relative;
    align-items: center;
    user-select: none;
    vertical-align: middle;
    justify-content: flex-start;
    gap: 10px;
`;

const Wallet = styled.ul`
    flex: 0 0 auto;
    margin: 0;
    padding: 0;
`;

const ConnectButton = styled(WalletMultiButton)`
    border-radius: 18px !important;
    padding: 5px 16px;
    background-color: #4E44CE;
    margin: 0 auto;
    height: unset;
    line-height: unset;
    font-family: monument;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    gap: 60px;
    padding: 0 20px;
    justify-content: space-between;
`;

const Logo = styled.div`
    display: inline-grid;
    & img {
        width: 70px;
        -webkit-filter: drop-shadow(2px 2px 2px #000000);
        filter: drop-shadow(2px 2px 2px #000000);
    }
`;

const Title = styled.div`
    margin-top: 20px;
    & img {
        max-width: 300px;
        -webkit-filter: drop-shadow(2px 2px 2px #000000);
        filter: drop-shadow(2px 2px 2px #000000);
    }
`;

const NFT = styled(Paper)`
    margin: 0 auto;
    margin-top: 30px;
    padding: 5px 20px 20px 20px;
    flex: 1 1 auto;
    background-color: rgba(20, 20, 20, 0.9) !important;
    box-shadow: 0px 0px 50px rgba(0, 0, 0) !important;
    border-radius: 10px !important;
`;

const Card = styled(Paper)`
    display: inline-block;
    background-color: var(--countdown-background-color) !important;
    margin: 5px;
    min-width: 40px;
    padding: 24px;
    h1 {
        margin: 0px;
    }
`;

const LinearProgress = styled.div`
    height: 25px;
    border-radius: 10px;
    background-color: black;
    padding: 5px;
    position: relative;
    margin-top: 20px;
    & div:last-child {
        background: repeating-linear-gradient(
            -45deg,
            #ec202d,
            #ec202d 10px,
            #582622 10px,
            #582622 20px
        );
        border-radius: 5px;
        height: 100%;
    }
    & div:first-child {
        position: absolute;
        width: 100%;
    }
`;

const MintButtonContainer = styled.div`
    font-family: monument !important;
    button.MuiButton-contained:not(.MuiButton-containedPrimary).Mui-disabled {
        color: #464646;
    }

    button.MuiButton-contained:not(.MuiButton-containedPrimary):hover,
    button.MuiButton-contained:not(.MuiButton-containedPrimary):focus {
        -webkit-animation: pulse 1s;
        animation: pulse 1s;
        box-shadow: 0 0 0 2em rgba(255, 255, 255, 0);
    }

    @-webkit-keyframes pulse {
        0% {
            box-shadow: 0 0 0 0 #ef8f6e;
        }
    }

    @keyframes pulse {
        0% {
            box-shadow: 0 0 0 0 #ef8f6e;
        }
    }
`;

const SolExplorerLink = styled.a`
    color: var(--title-text-color);
    border-bottom: 1px solid var(--title-text-color);
    font-weight: bold;
    list-style-image: none;
    list-style-position: outside;
    list-style-type: none;
    outline: none;
    text-decoration: none;
    text-size-adjust: 100%;

    :hover {
        border-bottom: 2px solid var(--title-text-color);
    }
`;

const MainContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin-top: 20px;
    margin-bottom: 20px;
    text-align: center;
    justify-content: center;
`;

const MintContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: 20px;
`;

const DesContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    gap: 20px;
    padding: 0 20px;
`;

const Price = styled(Chip)`
    margin-top: 10px;
    font-weight: bold;
    font-size: 1em !important;
    font-family: 'monument' !important;
`;

const Image = styled.img`
    height: 400px;
    width: auto;
    -webkit-filter: drop-shadow(0px 0px 5px #ff0000);
    filter: drop-shadow(0px 0px 5px #ff0000);
`;

export interface HomeProps {
    candyMachineId: anchor.web3.PublicKey;
    connection: anchor.web3.Connection;
    txTimeout: number;
    rpcHost: string;
}

const Home = (props: HomeProps) => {
    const [balance, setBalance] = useState<number>();
    const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
    const [isActive, setIsActive] = useState(false); // true when countdown completes or whitelisted
    const [solanaExplorerLink, setSolanaExplorerLink] = useState<string>("");
    const [itemsAvailable, setItemsAvailable] = useState(0);
    const [itemsRedeemed, setItemsRedeemed] = useState(0);
    const [itemsRemaining, setItemsRemaining] = useState(0);
    const [isSoldOut, setIsSoldOut] = useState(false);
    const [payWithSplToken, setPayWithSplToken] = useState(false);
    const [price, setPrice] = useState(0);
    const [priceLabel, setPriceLabel] = useState<string>("SOL");
    const [whitelistPrice, setWhitelistPrice] = useState(0);
    const [whitelistEnabled, setWhitelistEnabled] = useState(false);
    const [isBurnToken, setIsBurnToken] = useState(false);
    const [whitelistTokenBalance, setWhitelistTokenBalance] = useState(0);
    const [isEnded, setIsEnded] = useState(false);
    const [endDate, setEndDate] = useState<Date>();
    const [isPresale, setIsPresale] = useState(false);
    const [isWLOnly, setIsWLOnly] = useState(false);

    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: "",
        severity: undefined,
    });

    const wallet = useAnchorWallet();
    const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();

    const rpcUrl = props.rpcHost;
    const solFeesEstimation = 0.012; // approx of account creation fees

    const refreshCandyMachineState = () => {
        (async () => {
            if (!wallet) return;

            const cndy = await getCandyMachineState(
                wallet as anchor.Wallet,
                props.candyMachineId,
                props.connection,
            );

            setCandyMachine(cndy);
            setItemsAvailable(cndy.state.itemsAvailable);
            setItemsRemaining(cndy.state.itemsRemaining);
            setItemsRedeemed(cndy.state.itemsRedeemed);

            var divider = 1;
            if (decimals) {
                divider = +('1' + new Array(decimals).join('0').slice() + '0');
            }

            // detect if using spl-token to mint
            if (cndy.state.tokenMint) {
                setPayWithSplToken(true);
                // Customize your SPL-TOKEN Label HERE
                // TODO: get spl-token metadata name
                setPriceLabel(splTokenName);
                setPrice(cndy.state.price.toNumber() / divider);
                setWhitelistPrice(cndy.state.price.toNumber() / divider);
            } else {
                setPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
                setWhitelistPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
            }


            // fetch whitelist token balance
            if (cndy.state.whitelistMintSettings) {
                setWhitelistEnabled(true);
                setIsBurnToken(cndy.state.whitelistMintSettings.mode.burnEveryTime);
                setIsPresale(cndy.state.whitelistMintSettings.presale);
                setIsWLOnly(!isPresale && cndy.state.whitelistMintSettings.discountPrice === null);

                if (cndy.state.whitelistMintSettings.discountPrice !== null && cndy.state.whitelistMintSettings.discountPrice !== cndy.state.price) {
                    if (cndy.state.tokenMint) {
                        setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice?.toNumber() / divider);
                    } else {
                        setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice?.toNumber() / LAMPORTS_PER_SOL);
                    }
                }

                let balance = 0;
                try {
                    const tokenBalance =
                        await props.connection.getTokenAccountBalance(
                            (
                                await getAtaForMint(
                                    cndy.state.whitelistMintSettings.mint,
                                    wallet.publicKey,
                                )
                            )[0],
                        );

                    balance = tokenBalance?.value?.uiAmount || 0;
                } catch (e) {
                    console.error(e);
                    balance = 0;
                }
                setWhitelistTokenBalance(balance);
                setIsActive(isPresale && !isEnded && balance > 0);

            } else {
                setWhitelistEnabled(false);
            }

            // end the mint when date is reached
            if (cndy?.state.endSettings?.endSettingType.date) {
                setEndDate(toDate(cndy.state.endSettings.number));
                if (
                    cndy.state.endSettings.number.toNumber() <
                    new Date().getTime() / 1000
                ) {
                    setIsEnded(true);
                    setIsActive(false);
                }
            }
            // end the mint when amount is reached
            if (cndy?.state.endSettings?.endSettingType.amount) {
                let limit = Math.min(
                    cndy.state.endSettings.number.toNumber(),
                    cndy.state.itemsAvailable,
                );
                setItemsAvailable(limit);
                if (cndy.state.itemsRedeemed < limit) {
                    setItemsRemaining(limit - cndy.state.itemsRedeemed);
                } else {
                    setItemsRemaining(0);
                    cndy.state.isSoldOut = true;
                    setIsEnded(true);
                }
            } else {
                setItemsRemaining(cndy.state.itemsRemaining);
            }

            if (cndy.state.isSoldOut) {
                setIsActive(false);
            }
        })();
    };

    const renderGoLiveDateCounter = ({ days, hours, minutes, seconds }: any) => {
        return (
            <div><Card elevation={1}><h1>{days}</h1>Days</Card><Card elevation={1}><h1>{hours}</h1>
                Hours</Card><Card elevation={1}><h1>{minutes}</h1>Mins</Card><Card elevation={1}>
                    <h1>{seconds}</h1>Secs</Card></div>
        );
    };

    const renderEndDateCounter = ({ days, hours, minutes }: any) => {
        let label = "";
        if (days > 0) {
            label += days + " days "
        }
        if (hours > 0) {
            label += hours + " hours "
        }
        label += (minutes + 1) + " minutes left to MINT."
        return (
            <div><h3>{label}</h3></div>
        );
    };

    function displaySuccess(mintPublicKey: any, qty: number = 1): void {
        let remaining = itemsRemaining - qty;
        setItemsRemaining(remaining);
        setIsSoldOut(remaining === 0);
        if (isBurnToken && whitelistTokenBalance && whitelistTokenBalance > 0) {
            let balance = whitelistTokenBalance - qty;
            setWhitelistTokenBalance(balance);
            setIsActive(isPresale && !isEnded && balance > 0);
        }
        setItemsRedeemed(itemsRedeemed + qty);
        if (!payWithSplToken && balance && balance > 0) {
            setBalance(balance - ((whitelistEnabled ? whitelistPrice : price) * qty) - solFeesEstimation);
        }
        setSolanaExplorerLink(cluster === "devnet" || cluster === "testnet"
            ? ("https://solscan.io/token/" + mintPublicKey + "?cluster=" + cluster)
            : ("https://solscan.io/token/" + mintPublicKey));
        throwConfetti();
    };

    function throwConfetti(): void {
        confetti({
            particleCount: 400,
            spread: 70,
            origin: { y: 0.6 },
        });
    }

    function sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function mintMany(quantityString: number) {
        if (wallet && candyMachine?.program && wallet.publicKey) {
            const quantity = Number(quantityString);
            const futureBalance = (balance || 0) - ((whitelistEnabled && (whitelistTokenBalance > 0) ? whitelistPrice : price) * quantity);
            const signedTransactions = await mintMultipleToken(
                candyMachine,
                wallet.publicKey,
                quantity
            );

            const promiseArray = [];

            for (
                let index = 0;
                index < signedTransactions.length;
                index++
            ) {
                const tx = signedTransactions[index];
                promiseArray.push(
                    awaitTransactionSignatureConfirmation(
                        tx,
                        props.txTimeout,
                        props.connection,
                        true
                    )
                );
            }

            const allTransactionsResult = await Promise.all(promiseArray);
            let totalSuccess = 0;
            let totalFailure = 0;

            for (
                let index = 0;
                index < allTransactionsResult.length;
                index++
            ) {
                const transactionStatus = allTransactionsResult[index];
                if (!transactionStatus?.err) {
                    totalSuccess += 1;
                } else {
                    totalFailure += 1;
                }
            }

            let retry = 0;
            if (allTransactionsResult.length > 0) {
                let newBalance =
                    (await props.connection.getBalance(wallet.publicKey)) /
                    LAMPORTS_PER_SOL;


                while (newBalance > futureBalance && retry < 20) {
                    await sleep(2000);
                    newBalance =
                        (await props.connection.getBalance(wallet.publicKey)) /
                        LAMPORTS_PER_SOL;
                    retry++;
                    console.log("Estimated balance (" + futureBalance + ") not correct yet, wait a little bit and re-check. Current balance : " + newBalance + ", Retry " + retry);
                }
            }

            if (totalSuccess && retry < 20) {
                setAlertState({
                    open: true,
                    message: `Congratulations! Your ${quantity} mints succeeded!`,
                    severity: 'success',
                });

                // update front-end amounts
                displaySuccess(wallet.publicKey, quantity);
            }

            if (totalFailure || retry === 20) {
                setAlertState({
                    open: true,
                    message: `Some mints failed! (possibly ${totalFailure}) Wait a few minutes and check your wallet.`,
                    severity: 'error',
                });
            }

            if (totalFailure === 0 && totalSuccess === 0) {
                setAlertState({
                    open: true,
                    message: `Mints manually cancelled.`,
                    severity: 'error',
                });
            }
        }
    }

    async function mintOne() {
        if (wallet && candyMachine?.program && wallet.publicKey) {
            const mint = anchor.web3.Keypair.generate();
            const mintResult = await mintOneToken(candyMachine, wallet.publicKey);

            let status: any = {err: true};
            if (mintResult) {
                status = await awaitTransactionSignatureConfirmation(
                    mintResult.mintTxId,
                    props.txTimeout,
                    props.connection,
                    true,
                );
            }

            if (!status?.err) {
                setAlertState({
                    open: true,
                    message: 'Congratulations! Mint succeeded!',
                    severity: 'success',
                });

                // update front-end amounts
                displaySuccess(mint.publicKey);
            } else {
                setAlertState({
                    open: true,
                    message: 'Mint failed! Please try again!',
                    severity: 'error',
                });
            }
        }
    }

    const startMint = async (quantityString: number) => {
        try {
            setIsMinting(true);
            await mintMany(quantityString);
        } catch (error: any) {
            let message = error.msg || 'Minting failed! Please try again!';
            if (!error.msg) {
                if (!error.message) {
                    message = 'Transaction Timeout! Please try again.';
                } else if (error.message.indexOf('0x138')) {
                } else if (error.message.indexOf('0x137')) {
                    message = `SOLD OUT!`;
                } else if (error.message.indexOf('0x135')) {
                    message = `Insufficient funds to mint. Please fund your wallet.`;
                }
            } else {
                if (error.code === 311) {
                    message = `SOLD OUT!`;
                } else if (error.code === 312) {
                    message = `Minting period hasn't started yet.`;
                }
            }

            setAlertState({
                open: true,
                message,
                severity: "error",
            });
        } finally {
            setIsMinting(false);
        }
    };

    useEffect(() => {
        (async () => {
            if (wallet) {
                const balance = await props.connection.getBalance(wallet!.publicKey);
                setBalance(balance / LAMPORTS_PER_SOL);
            }
        })();
    }, [wallet, props.connection]);

    useEffect(refreshCandyMachineState, [
        wallet,
        props.candyMachineId,
        props.connection,
        isEnded,
        isPresale
    ]);


    return (
        <main>
            <MainContainer>
                <Header>
                    <Logo>
                        <img src="img/wobble.png" alt="" />
                    </Logo>
                    <WalletContainer>
                        <Wallet>
                            {wallet ?
                                <WalletAmount>{(balance || 0).toLocaleString()} SOL<ConnectButton /></WalletAmount> :
                                <ConnectButton>Connect Wallet</ConnectButton>}
                        </Wallet>
                    </WalletContainer>
                </Header>
                <br />
                <MintContainer>
                    <DesContainer>
                        <NFT elevation={3}>
                            <Title><img src="img/title.png" alt="" /></Title>
                            {wallet && isActive &&
                                // {100 - (itemsRemaining * 100 / itemsAvailable)}
                                <LinearProgress>
                                    <div>TOTAL MINTED : {itemsRedeemed} / {itemsAvailable}</div>
                                    <div style={{ width: 100 - (itemsRemaining * 100 / itemsAvailable) + '%' }} />
                                </LinearProgress>
                            }
                            <div style={{ display: 'flex', justifyContent: 'right' }}>
                                <Price label={isActive && whitelistEnabled && (whitelistTokenBalance > 0) ? (whitelistPrice + " " + priceLabel) : (price + " " + priceLabel)} />
                            </div>
                            <br />
                            <div>
                                <Image src="img/wobbles.png" alt="NFT To Mint" />
                            </div>
                            <br />
                            {wallet && isActive && whitelistEnabled && (whitelistTokenBalance > 0) && isBurnToken &&
                                <h3>You own {whitelistTokenBalance} WL mint {whitelistTokenBalance > 1 ? "tokens" : "token"}.</h3>}
                            {wallet && isActive && whitelistEnabled && (whitelistTokenBalance > 0) && !isBurnToken &&
                                <h3>You are whitelisted and allowed to mint.</h3>}
                            {wallet && isActive && endDate && Date.now() < endDate.getTime() &&
                                <Countdown
                                    date={toDate(candyMachine?.state?.endSettings?.number)}
                                    onMount={({ completed }) => completed && setIsEnded(true)}
                                    onComplete={() => {
                                        setIsEnded(true);
                                    }}
                                    renderer={renderEndDateCounter}
                                />}
                            <br />
                            <MintButtonContainer>
                                {!isActive && !isEnded && candyMachine?.state.goLiveDate && (!isWLOnly || whitelistTokenBalance > 0) ? (
                                    <Countdown
                                        date={toDate(candyMachine?.state.goLiveDate)}
                                        onMount={({ completed }) => completed && setIsActive(!isEnded)}
                                        onComplete={() => {
                                            setIsActive(!isEnded);
                                        }}
                                        renderer={renderGoLiveDateCounter}
                                    />) : (
                                    !wallet ? (
                                        <ConnectButton>Connect Wallet</ConnectButton>
                                    ) : (!isWLOnly || whitelistTokenBalance > 0) ?
                                        candyMachine?.state.gatekeeper &&
                                            wallet.publicKey &&
                                            wallet.signTransaction ? (
                                            <GatewayProvider
                                                wallet={{
                                                    publicKey:
                                                        wallet.publicKey ||
                                                        new PublicKey(CANDY_MACHINE_PROGRAM),
                                                    //@ts-ignore
                                                    signTransaction: wallet.signTransaction,
                                                }}
                                                // // Replace with following when added
                                                // gatekeeperNetwork={candyMachine.state.gatekeeper_network}
                                                gatekeeperNetwork={
                                                    candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                                                } // This is the ignite (captcha) network
                                                /// Don't need this for mainnet
                                                clusterUrl={rpcUrl}
                                                options={{ autoShowModal: false }}
                                            >
                                                <MintButton
                                                    candyMachine={candyMachine}
                                                    isMinting={isMinting}
                                                    isActive={isActive}
                                                    isEnded={isEnded}
                                                    isSoldOut={isSoldOut}
                                                    onMint={startMint}
                                                />
                                            </GatewayProvider>
                                        ) : (
                                            // <MintButton
                                            //     candyMachine={candyMachine}
                                            //     isMinting={isMinting}
                                            //     isActive={isActive}
                                            //     isEnded={isEnded}
                                            //     isSoldOut={isSoldOut}
                                            //     onMint={startMint}
                                            // />
                                            <MultiMintButton
                                                candyMachine={candyMachine}
                                                isMinting={isMinting}
                                                isActive={isActive}
                                                isEnded={isEnded}
                                                isSoldOut={isSoldOut}
                                                onMint={startMint}
                                                price={whitelistEnabled && (whitelistTokenBalance > 0) ? whitelistPrice : price}
                                            />
                                        ) :
                                        <h1>Mint is private.</h1>
                                )}
                            </MintButtonContainer>
                            <br />
                            {wallet && isActive && solanaExplorerLink &&
                                <SolExplorerLink href={solanaExplorerLink} target="_blank">View on Solscan</SolExplorerLink>}
                        </NFT>
                    </DesContainer>
                </MintContainer>
            </MainContainer>
            <Snackbar
                open={alertState.open}
                autoHideDuration={6000}
                onClose={() => setAlertState({ ...alertState, open: false })}
            >
                <Alert
                    onClose={() => setAlertState({ ...alertState, open: false })}
                    severity={alertState.severity}
                >
                    {alertState.message}
                </Alert>
            </Snackbar>
        </main>
    );
};

export default Home;
