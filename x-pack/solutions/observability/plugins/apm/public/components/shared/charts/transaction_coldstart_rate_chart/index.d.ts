import React from 'react';
interface Props {
    height?: number;
    showAnnotations?: boolean;
    kuery: string;
    environment: string;
    transactionName?: string;
    comparisonEnabled?: boolean;
    offset?: string;
}
export declare function TransactionColdstartRateChart({ height, showAnnotations, environment, kuery, transactionName, comparisonEnabled, offset, }: Props): React.JSX.Element;
export {};
