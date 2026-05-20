import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ApmMlJob } from '../../../common/anomaly_detection/apm_ml_job';
export declare function apmMlJobsQuery(jobs: ApmMlJob[]): QueryDslQueryContainer[];
