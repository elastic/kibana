import type { AgentConfigurationIntake } from '../../../../common/agent_configuration/configuration_types';
import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
export declare function createOrUpdateConfiguration({ configurationId, configurationIntake, internalESClient, }: {
    configurationId?: string;
    configurationIntake: AgentConfigurationIntake;
    internalESClient: APMInternalESClient;
}): Promise<import("@elastic/elasticsearch/lib/api/types").WriteResponseBase>;
