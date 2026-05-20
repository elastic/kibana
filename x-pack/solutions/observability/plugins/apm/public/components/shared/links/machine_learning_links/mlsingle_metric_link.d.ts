import type { ReactNode } from 'react';
import React from 'react';
interface Props {
    children?: ReactNode;
    jobId: string;
    detectorIndex?: number;
    external?: boolean;
    serviceName?: string;
    transactionType?: string;
}
export declare function MLSingleMetricLink({ jobId, detectorIndex, serviceName, transactionType, external, children, }: Props): React.JSX.Element;
export {};
