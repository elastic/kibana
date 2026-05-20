import type { MlAnomalyDetectors } from '@kbn/ml-plugin/server';
import type { ApmMlJob } from '../../../common/anomaly_detection/apm_ml_job';
export declare function getMlJobsWithAPMGroup(anomalyDetectors: MlAnomalyDetectors): Promise<ApmMlJob[]>;
