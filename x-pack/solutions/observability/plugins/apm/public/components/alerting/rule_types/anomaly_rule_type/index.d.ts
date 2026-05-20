import React from 'react';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { AlertMetadata } from '../../utils/helper';
import type { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';
export interface AlertParams {
    anomalySeverityType?: ML_ANOMALY_SEVERITY.CRITICAL | ML_ANOMALY_SEVERITY.MAJOR | ML_ANOMALY_SEVERITY.MINOR | ML_ANOMALY_SEVERITY.WARNING;
    anomalyDetectorTypes?: AnomalyDetectorType[];
    environment?: string;
    serviceName?: string;
    transactionType?: string;
    windowSize?: number;
    windowUnit?: string;
}
interface Props {
    ruleParams: AlertParams;
    metadata?: AlertMetadata;
    setRuleParams: (key: string, value: any) => void;
    setRuleProperty: (key: string, value: any) => void;
    errors: {
        anomalyDetectorTypes?: string;
    };
}
export declare function AnomalyRuleType(props: Props): React.JSX.Element;
export default AnomalyRuleType;
