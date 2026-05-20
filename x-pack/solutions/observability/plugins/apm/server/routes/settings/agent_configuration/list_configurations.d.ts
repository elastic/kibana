import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
export declare function listConfigurations({ internalESClient, apmEventClient, apmIndices, }: {
    internalESClient: APMInternalESClient;
    apmEventClient?: APMEventClient;
    apmIndices: APMIndices;
}): Promise<{
    applied_by_agent: boolean;
    '@timestamp': number;
    etag: string;
    agent_name?: string;
    error?: string;
    service: {
        name?: string | undefined;
        environment?: string | undefined;
    };
    settings: {
        [x: string]: string;
    } & {
        [x: string]: any;
    };
}[]>;
