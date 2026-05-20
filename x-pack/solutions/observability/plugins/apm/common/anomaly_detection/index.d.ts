import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
export type { ServiceAnomalyStats } from '@kbn/apm-types';
export declare function getSeverity(score: number | undefined): ML_ANOMALY_SEVERITY;
export declare function getSeverityColor(score: number): string;
export declare const ML_ERRORS: {
    INVALID_LICENSE: string;
    MISSING_READ_PRIVILEGES: string;
    MISSING_WRITE_PRIVILEGES: string;
    ML_NOT_AVAILABLE: string;
    ML_NOT_AVAILABLE_IN_SPACE: string;
};
