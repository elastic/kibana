import React from 'react';
export declare function HttpRequestsChart({ kuery, serviceName, start, end, transactionName, environment, offset, comparisonEnabled, }: {
    kuery: string;
    serviceName: string;
    start: string;
    end: string;
    transactionType?: string;
    transactionName?: string;
    environment: string;
    offset?: string;
    comparisonEnabled: boolean;
}): React.JSX.Element;
