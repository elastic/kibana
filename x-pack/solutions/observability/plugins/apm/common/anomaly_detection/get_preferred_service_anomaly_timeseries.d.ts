import type { Environment } from '../environment_rt';
import type { AnomalyDetectorType } from './apm_ml_detectors';
import type { ServiceAnomalyTimeseries } from './service_anomaly_timeseries';
export declare function getPreferredServiceAnomalyTimeseries({ preferredEnvironment, detectorType, allAnomalyTimeseries, fallbackToTransactions, }: {
    preferredEnvironment: Environment;
    detectorType: AnomalyDetectorType;
    allAnomalyTimeseries: ServiceAnomalyTimeseries[];
    fallbackToTransactions: boolean;
}): ServiceAnomalyTimeseries | undefined;
