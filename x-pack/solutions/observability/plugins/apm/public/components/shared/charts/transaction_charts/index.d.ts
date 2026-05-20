import React from 'react';
export declare function TransactionCharts({ kuery, environment, start, end, serviceName, transactionName, isServerlessContext, comparisonEnabled, offset, }: {
    kuery: string;
    environment: string;
    start: string;
    end: string;
    serviceName: string;
    transactionName?: string;
    isServerlessContext?: boolean;
    comparisonEnabled?: boolean;
    offset?: string;
}): React.JSX.Element;
