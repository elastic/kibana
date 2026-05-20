import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
export declare function findExactConfiguration({ service, internalESClient, apmEventClient, }: {
    service: AgentConfiguration['service'];
    internalESClient: APMInternalESClient;
    apmEventClient: APMEventClient;
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
    id: string | undefined;
} | undefined>;
