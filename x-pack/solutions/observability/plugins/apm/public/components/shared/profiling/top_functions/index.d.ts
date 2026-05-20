import React from 'react';
interface Props {
    serviceName: string;
    rangeFrom: string;
    rangeTo: string;
    kuery: string;
    transactionName?: string;
    transactionType?: string;
    environment: string;
}
export declare function ProfilingTopNFunctions({ serviceName, rangeFrom, rangeTo, kuery, transactionName, transactionType, environment, }: Props): React.JSX.Element;
export {};
