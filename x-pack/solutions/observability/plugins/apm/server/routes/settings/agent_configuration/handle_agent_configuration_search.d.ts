import type { Logger } from '@kbn/core/server';
import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
import type { AgentConfigSearchParams } from './route';
export declare function handleAgentConfigurationSearch({ params, internalESClient, logger, }: {
    params: AgentConfigSearchParams;
    internalESClient: APMInternalESClient;
    logger: Logger;
}): Promise<import("@kbn/es-types").SearchHit<import("../../../../common/agent_configuration/configuration_types").AgentConfiguration> | null>;
