import React from 'react';
export declare function HttpErrorRateChart({ height, kuery, serviceName, start, end, environment, offset, comparisonEnabled, }: {
    height: number;
    kuery: string;
    serviceName: string;
    start: string;
    end: string;
    environment: string;
    offset?: string;
    comparisonEnabled: boolean;
}): React.JSX.Element;
