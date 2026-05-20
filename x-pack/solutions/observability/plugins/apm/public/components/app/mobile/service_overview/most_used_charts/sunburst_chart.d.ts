import React from 'react';
import { FETCH_STATUS } from '../../../../../hooks/use_fetcher';
export declare function SunburstChart({ data, label, chartKey, fetchStatus, chartWidth, }: {
    data?: Array<{
        key: string | number;
        docCount: number;
    }>;
    label?: string;
    chartKey: string;
    fetchStatus: FETCH_STATUS;
    chartWidth: number;
}): React.JSX.Element;
export declare function NoResultsFound(): React.JSX.Element;
