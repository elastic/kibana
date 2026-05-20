import type { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
export declare function markError({ id, body, error, internalESClient, }: {
    id: string;
    body: AgentConfiguration;
    error: string;
    internalESClient: APMInternalESClient;
}): Promise<import("@elastic/elasticsearch/lib/api/types").WriteResponseBase>;
