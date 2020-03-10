/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsClientContract } from 'kibana/server';
import { AuthenticatedUser } from '../../../security/server';
import { DEFAULT_AGENT_CONFIG, AGENT_CONFIG_SAVED_OBJECT_TYPE } from '../constants';
import {
  Datasource,
  NewAgentConfig,
  AgentConfig,
  FullAgentConfig,
  FullAgentConfigDatasource,
  AgentConfigStatus,
  ListWithKuery,
} from '../types';
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
    const configs = await soClient.find<AgentConfig>({
      type: AGENT_CONFIG_SAVED_OBJECT_TYPE,
      filter: 'agent_configs.attributes.is_default:true',
    });

    if (configs.total === 0) {
      const newDefaultAgentConfig: NewAgentConfig = {
        ...DEFAULT_AGENT_CONFIG,
      };

      return await this.create(soClient, newDefaultAgentConfig);
    }

    return {
      id: configs.saved_objects[0].id,
      ...configs.saved_objects[0].attributes,
    };
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

    if (!agentConfig.is_default) {
      await this.triggerAgentConfigUpdatedEvent(soClient, 'created', newSo.id);
    }

    return {
      id: newSo.id,
      ...newSo.attributes,
    };
  }

  public async get(
    soClient: SavedObjectsClientContract,
    id: string,
    withDatasources: boolean = true
  ): Promise<AgentConfig | null> {
    const agentConfigSO = await soClient.get<AgentConfig>(SAVED_OBJECT_TYPE, id);
    if (!agentConfigSO) {
      return null;
    }

    if (agentConfigSO.error) {
      throw new Error(agentConfigSO.error.message);
    }

    const agentConfig: AgentConfig = {
      id: agentConfigSO.id,
      ...agentConfigSO.attributes,
    };

    if (withDatasources) {
      agentConfig.datasources =
        (await datasourceService.getByIDs(
          soClient,
          (agentConfigSO.attributes.datasources as string[]) || []
        )) || [];
    }

    return agentConfig;
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
    const oldAgentConfig = await this.get(soClient, id, false);

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
    const oldAgentConfig = await this.get(soClient, id, false);

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

  public async getDefaultAgentConfigId(soClient: SavedObjectsClientContract) {
    const configs = await soClient.find({
      type: AGENT_CONFIG_SAVED_OBJECT_TYPE,
      filter: 'agent_configs.attributes.is_default:true',
    });

    if (configs.saved_objects.length === 0) {
      throw new Error('No default agent config');
    }

    return configs.saved_objects[0].id;
  }

  public async delete(
    soClient: SavedObjectsClientContract,
    ids: string[]
  ): Promise<DeleteAgentConfigsResponse> {
    const result: DeleteAgentConfigsResponse = [];
    const defaultConfigId = await this.getDefaultAgentConfigId(soClient);

    if (ids.includes(defaultConfigId)) {
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

  private storedDatasourceToAgentDatasource = (
    datasource: Datasource
  ): FullAgentConfigDatasource => {
    const { name, namespace, enabled, package: pkg, output_id, inputs } = datasource;
    return {
      name,
      namespace,
      enabled,
      package: pkg
        ? {
            name: pkg.name,
            version: pkg.version,
          }
        : undefined,
      use_output: output_id,
      inputs: inputs
        .filter(input => input.enabled)
        .map(input => ({
          ...input,
          streams: input.streams.map(stream => ({
            ...stream,
            config: undefined,
            ...(stream.config || {}),
          })),
        })),
    };
  };

  public async getFullConfig(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<FullAgentConfig | null> {
    let config;

    try {
      config = await this.get(soClient, id);
    } catch (err) {
      if (!err.isBoom || err.output.statusCode !== 404) {
        throw err;
      }
    }

    if (!config) {
      return null;
    }

    const agentConfig: FullAgentConfig = {
      id: config.id,
      outputs: {
        // TEMPORARY as we only support a default output
        ...[
          await outputService.get(soClient, await outputService.getDefaultOutputId(soClient)),
        ].reduce((outputs, { config: outputConfig, name, type, hosts, ca_sha256, api_key }) => {
          outputs[name] = {
            type,
            hosts,
            ca_sha256,
            api_key,
            ...outputConfig,
          };
          return outputs;
        }, {} as FullAgentConfig['outputs']),
      },
      datasources: (config.datasources as Datasource[]).map(ds =>
        this.storedDatasourceToAgentDatasource(ds)
      ),
    };

    return agentConfig;
  }
}

export const agentConfigService = new AgentConfigService();
