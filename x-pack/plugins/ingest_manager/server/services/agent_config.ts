/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'kibana/server';
import { NewAgentConfig, AgentConfig, ListWithKuery } from '../types';

const SAVED_OBJECT_TYPE = 'agent_configs';

class AgentConfigService {
  public async create(
    soClient: SavedObjectsClientContract,
    agentConfig: NewAgentConfig,
    options?: { id?: string }
  ): Promise<AgentConfig> {
    const newSo = await soClient.create<AgentConfig>(
      SAVED_OBJECT_TYPE,
      agentConfig as AgentConfig,
      options
    );

    return {
      id: newSo.id,
      ...newSo.attributes,
    };
  }

  public async get(soClient: SavedObjectsClientContract, id: string): Promise<AgentConfig | null> {
    const agentConfigSO = await soClient.get<AgentConfig>(SAVED_OBJECT_TYPE, id);
    if (!agentConfigSO) {
      return null;
    }

    if (agentConfigSO.error) {
      throw new Error(agentConfigSO.error.message);
    }

    return {
      id: agentConfigSO.id,
      ...agentConfigSO.attributes,
    };
  }

  public async list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery
  ): Promise<{ items: AgentConfig[]; total: number; page: number; perPage: number }> {
    const { page = 1, perPage = 20, kuery } = options;

    const agentConfigs = await soClient.find<AgentConfig>({
      type: SAVED_OBJECT_TYPE,
      page,
      perPage,
      // To ensure users don't need to know about SO data structure...
      filter: kuery
        ? kuery.replace(
            new RegExp(`${SAVED_OBJECT_TYPE}\.`, 'g'),
            `${SAVED_OBJECT_TYPE}.attributes.`
          )
        : undefined,
    });

    return {
      items: agentConfigs.saved_objects.map<AgentConfig>(agentConfigSO => {
        return {
          id: agentConfigSO.id,
          ...agentConfigSO.attributes,
        };
      }),
      total: agentConfigs.total,
      page,
      perPage,
    };
  }

  public async update(
    soClient: SavedObjectsClientContract,
    id: string,
    agentConfig: AgentConfig
  ): Promise<AgentConfig> {
    await soClient.update<AgentConfig>(SAVED_OBJECT_TYPE, id, agentConfig);
    return agentConfig;
  }

  public async delete(soClient: SavedObjectsClientContract, id: string): Promise<void> {
    await soClient.delete(SAVED_OBJECT_TYPE, id);
  }
}

export const agentConfigService = new AgentConfigService();
