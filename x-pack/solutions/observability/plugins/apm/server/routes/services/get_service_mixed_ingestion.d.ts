import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { IngestionTimeRanges } from '../../../common/metrics_types';
export interface ServiceMixedIngestionResponse {
    hasMultipleAgentTypes: boolean;
    ingestionTimeRanges?: IngestionTimeRanges;
}
export declare function getServiceMixedIngestion({ serviceName, apmEventClient, start, end, environment, kuery, }: {
    serviceName: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    environment: string;
    kuery: string;
}): Promise<ServiceMixedIngestionResponse>;
