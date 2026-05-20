import type { BoolQuery } from '@kbn/es-query';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { APMConfig } from '../..';
export declare function getTraceSampleIds({ serviceName, environment, config, apmEventClient, start, end, serviceGroupKuery, kuery, esQuery, }: {
    serviceName?: string;
    environment: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    serviceGroupKuery?: string;
    kuery?: string;
    /** Pre-built ES query from the client (includes KQL query + filter bar + Controls API). */
    esQuery?: {
        bool: BoolQuery;
    };
}): Promise<{
    traceIds: string[];
}>;
