import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AnomalyDetectorType } from '../../../common/anomaly_detection/apm_ml_detectors';
export declare function apmMlAnomalyQuery({ serviceName, transactionType, detectorTypes, }: {
    serviceName?: string;
    detectorTypes?: AnomalyDetectorType[];
    transactionType?: string;
}): QueryDslQueryContainer[];
