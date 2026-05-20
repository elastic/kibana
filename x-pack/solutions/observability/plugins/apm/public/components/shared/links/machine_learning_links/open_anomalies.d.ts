import React from 'react';
import type { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';
interface OpenAnomaliesProps {
    hasValidMlLicense?: boolean;
    mlJobId?: string;
    detectorType: AnomalyDetectorType;
    dataTestSubj?: string;
}
export declare function OpenAnomalies({ hasValidMlLicense, mlJobId, detectorType, dataTestSubj, }: OpenAnomaliesProps): React.JSX.Element | null;
export {};
