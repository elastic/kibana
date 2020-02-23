/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'kibana/server';
import { flatten } from 'lodash';
import { AuthenticatedUser } from '../../../security/server';
import {
  DEFAULT_AGENT_CONFIG_ID,
  DEFAULT_AGENT_CONFIG,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
} from '../constants';
import { NewAgentConfig, AgentConfig, AgentConfigStatus, ListWithKuery } from '../types';
import { DeleteAgentConfigsResponse } from '../../common';
import { datasourceService } from './datasource';
import { outputService } from './output';
import { agentConfigUpdateEventHandler } from './agent_config_update';

const SAVED_OBJECT_TYPE = AGENT_CONFIG_SAVED_OBJECT_TYPE;

class AgentConfigService {
  private triggerAgentConfigUpdatedEvent = async (
    soClient: SavedObjectsClientContract,
    action: string,
    agentConfigId: string
  ) => {
    return agentConfigUpdateEventHandler(soClient, action, agentConfigId);
  };

  private async _update(
    soClient: SavedObjectsClientContract,
    id: string,
    agentConfig: Partial<AgentConfig>,
    user?: AuthenticatedUser
  ): Promise<AgentConfig> {
    await soClient.update<AgentConfig>(SAVED_OBJECT_TYPE, id, {
      ...agentConfig,
      updated_on: new Date().toString(),
      updated_by: user ? user.username : 'system',
    });

    await this.triggerAgentConfigUpdatedEvent(soClient, 'updated', id);

    return (await this.get(soClient, id)) as AgentConfig;
  }

  public async ensureDefaultAgentConfig(soClient: SavedObjectsClientContract) {
    let defaultAgentConfig;

    try {
      defaultAgentConfig = await this.get(soClient, DEFAULT_AGENT_CONFIG_ID);
    } catch (err) {
      if (!err.isBoom || err.output.statusCode !== 404) {
        throw err;
      }
    }

    if (!defaultAgentConfig) {
      const newDefaultAgentConfig: NewAgentConfig = {
        ...DEFAULT_AGENT_CONFIG,
      };

      await this.create(soClient, newDefaultAgentConfig, {
        id: DEFAULT_AGENT_CONFIG_ID,
      });
    }
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

    await this.triggerAgentConfigUpdatedEvent(soClient, 'created', newSo.id);

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
      datasources:
        (await datasourceService.getByIDs(
          soClient,
          (agentConfigSO.attributes.datasources as string[]) || []
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
    agentConfig: Partial<AgentConfig>,
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

  public async assignDatasources(
    soClient: SavedObjectsClientContract,
    id: string,
    datasourceIds: string[],
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
        datasources: [...((oldAgentConfig.datasources || []) as string[])].concat(datasourceIds),
      },
      options?.user
    );
  }

  public async unassignDatasources(
    soClient: SavedObjectsClientContract,
    id: string,
    datasourceIds: string[],
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
        datasources: [...((oldAgentConfig.datasources || []) as string[])].filter(
          dsId => !datasourceIds.includes(dsId)
        ),
      },
      options?.user
    );
  }

  public async delete(
    soClient: SavedObjectsClientContract,
    ids: string[]
  ): Promise<DeleteAgentConfigsResponse> {
    const result: DeleteAgentConfigsResponse = [];

    if (ids.includes(DEFAULT_AGENT_CONFIG_ID)) {
      throw new Error('The default agent configuration cannot be deleted');
    }

    for (const id of ids) {
      try {
        await soClient.delete(SAVED_OBJECT_TYPE, id);
        await this.triggerAgentConfigUpdatedEvent(soClient, 'deleted', id);
        result.push({
          id,
          success: true,
        });
      } catch (e) {
        result.push({
          id,
          success: false,
        });
      }
    }

    return result;
  }

  private storedDatasourceToAgentStreams(datasources: AgentConfig['datasources'] = []): any[] {
    return flatten(
      // @ts-ignore
      datasources.map((ds: any) => {
        return ds.streams.map((stream: any) => ({
          ...stream.input,
          id: stream.id,
          type: stream.input.type as any,
          output: { use_output: stream.output_id },
          ...(stream.config || {}),
        }));
      })
    );
  }

  public async getFullPolicy(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<any | null> {
    let policy;

    try {
      policy = await this.get(soClient, id);
    } catch (err) {
      if (!err.isBoom || err.output.statusCode !== 404) {
        throw err;
      }
    }

    if (!policy) {
      return null;
    }

    const agentPolicy = {
      id: policy.id,
      outputs: {
        // TEMPORARY as we only support a default output
        ...[await outputService.get(soClient, 'default')].reduce(
          (outputs, { config, ...output }) => {
            outputs[output.id] = {
              ...output,
              type: output.type as any,
              ...config,
            };
            return outputs;
          },
          {} as any
        ),
      },
      streams:
        policy.datasources && policy.datasources.length
          ? this.storedDatasourceToAgentStreams(policy.datasources)
          : [],
    };

    return agentPolicy;
  }
}

export const agentConfigService = new AgentConfigService();
