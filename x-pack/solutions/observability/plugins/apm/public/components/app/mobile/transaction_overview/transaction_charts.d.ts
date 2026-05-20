import React from 'react';
export declare function MobileTransactionCharts({ serviceName, kuery, environment, start, end, transactionType, offset, comparisonEnabled, }: {
    serviceName: string;
    kuery: string;
    environment: string;
    start: string;
    end: string;
    transactionType?: string;
    offset?: string;
    comparisonEnabled: boolean;
}): React.JSX.Element;
