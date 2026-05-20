import React from 'react';
import type { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';
interface Props {
    values: AnomalyDetectorType[];
    onChange: (values?: AnomalyDetectorType[]) => void;
}
export declare function SelectAnomalyDetector({ values, onChange }: Props): React.JSX.Element;
export {};
