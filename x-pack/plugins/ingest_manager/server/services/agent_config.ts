/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'kibana/server';
import { AuthenticatedUser } from '../../../security/server';
import { DEFAULT_AGENT_CONFIG_ID } from '../constants';
import {
  NewAgentConfig,
  AgentConfig,
  AgentConfigStatus,
  AgentConfigUpdateHandler,
  ListWithKuery,
} from '../types';
import { dataStreamService } from './data_stream';

const SAVED_OBJECT_TYPE = 'agent_configs';

class AgentConfigService {
  private eventsHandler: AgentConfigUpdateHandler[] = [];

  public registerAgentConfigUpdateHandler(handler: AgentConfigUpdateHandler) {
    this.eventsHandler.push(handler);
  }

  public triggerPolicyUpdatedEvent: AgentConfigUpdateHandler = async (action, agentConfigId) => {
    for (const handler of this.eventsHandler) {
      await handler(action, agentConfigId);
    }
  };

  private async _update(
    soClient: SavedObjectsClientContract,
    id: string,
    agentConfig: NewAgentConfig,
    user?: AuthenticatedUser
  ): Promise<AgentConfig> {
    await soClient.update<AgentConfig>(SAVED_OBJECT_TYPE, id, {
      ...agentConfig,
      updated_on: new Date().toString(),
      updated_by: user ? user.username : 'system',
    });

    await this.triggerPolicyUpdatedEvent('updated', id);

    return (await this.get(soClient, id)) as AgentConfig;
  }

  public async ensureDefaultPolicy() {
    // TODO: Check with platform about using saved object client as an internal user
  }

  public async create(
    soClient: SavedObjectsClientContract,
    agentConfig: NewAgentConfig,
    options?: { id?: string; user?: AuthenticatedUser }
  ): Promise<AgentConfig> {
    const newSo = await soClient.create<AgentConfig>(
      SAVED_OBJECT_TYPE,
      {
        ...agentConfig,
        updated_on: new Date().toISOString(),
        updated_by: options?.user?.username || 'system',
      } as AgentConfig,
      options
    );

    await this.triggerPolicyUpdatedEvent('created', newSo.id);

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
      data_streams:
        (await dataStreamService.getByIDs(
          soClient,
          (agentConfigSO.attributes.data_streams as string[]) || []
        )) || [],
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
    agentConfig: NewAgentConfig,
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentConfig> {
    const oldAgentConfig = await this.get(soClient, id);

    if (!oldAgentConfig) {
      throw new Error('Agent config not found');
    }

    if (
      oldAgentConfig.status === AgentConfigStatus.Inactive &&
      agentConfig.status !== AgentConfigStatus.Active
    ) {
      throw new Error(
        `Agent config ${id} cannot be updated because it is ${oldAgentConfig.status}`
      );
    }

    return this._update(soClient, id, agentConfig, options?.user);
  }

  public async assignDataStreams(
    soClient: SavedObjectsClientContract,
    id: string,
    dataStreamIds: string[],
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentConfig> {
    const oldAgentConfig = await this.get(soClient, id);

    if (!oldAgentConfig) {
      throw new Error('Agent config not found');
    }

    return await this._update(
      soClient,
      id,
      {
        ...oldAgentConfig,
        data_streams: [...((oldAgentConfig.data_streams || []) as string[])].concat(dataStreamIds),
      },
      options?.user
    );
  }

  public async unassignDataStreams(
    soClient: SavedObjectsClientContract,
    id: string,
    dataStreamIds: string[],
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentConfig> {
    const oldAgentConfig = await this.get(soClient, id);

    if (!oldAgentConfig) {
      throw new Error('Agent config not found');
    }

    return await this._update(
      soClient,
      id,
      {
        ...oldAgentConfig,
        data_streams: [...((oldAgentConfig.data_streams || []) as string[])].filter(
          dsId => !dataStreamIds.includes(dsId)
        ),
      },
      options?.user
    );
  }

  public async delete(soClient: SavedObjectsClientContract, ids: string[]): Promise<void> {
    if (ids.includes(DEFAULT_AGENT_CONFIG_ID)) {
      throw new Error('The default agent configuration cannot be deleted');
    }

    for (const id of ids) {
      await soClient.delete(SAVED_OBJECT_TYPE, id);
      await this.triggerPolicyUpdatedEvent('deleted', id);
    }
  }
}

export const agentConfigService = new AgentConfigService();
