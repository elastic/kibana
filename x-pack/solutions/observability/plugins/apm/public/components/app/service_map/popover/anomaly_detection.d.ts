import React from 'react';
import type { ServiceAnomalyStats } from '../../../../../common/anomaly_detection';
interface Props {
    serviceName: string;
    serviceAnomalyStats: ServiceAnomalyStats | undefined;
}
export declare function AnomalyDetection({ serviceName, serviceAnomalyStats }: Props): React.JSX.Element;
export {};
