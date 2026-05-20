import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getAgentConfigEtagMetrics(apmEventClient: APMEventClient, etag?: string): Promise<string[]>;
