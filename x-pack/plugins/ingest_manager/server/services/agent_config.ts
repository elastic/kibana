/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { uniq } from 'lodash';
import { SavedObjectsClientContract } from 'src/core/server';
import { AuthenticatedUser } from '../../../security/server';
import {
  DEFAULT_AGENT_CONFIG,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
} from '../constants';
import {
  Datasource,
  NewAgentConfig,
  AgentConfig,
  FullAgentConfig,
  AgentConfigStatus,
  ListWithKuery,
} from '../types';
import { DeleteAgentConfigResponse, storedDatasourceToAgentDatasource } from '../../common';
import { listAgents } from './agents';
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
    const oldAgentConfig = await this.get(soClient, id, false);

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

    await soClient.update<AgentConfig>(SAVED_OBJECT_TYPE, id, {
      ...agentConfig,
      revision: oldAgentConfig.revision + 1,
      updated_on: new Date().toISOString(),
      updated_by: user ? user.username : 'system',
    });

    await this.triggerAgentConfigUpdatedEvent(soClient, 'updated', id);

    return (await this.get(soClient, id)) as AgentConfig;
  }

  public async ensureDefaultAgentConfig(soClient: SavedObjectsClientContract) {
    const configs = await soClient.find<AgentConfig>({
      type: AGENT_CONFIG_SAVED_OBJECT_TYPE,
      filter: `${AGENT_CONFIG_SAVED_OBJECT_TYPE}.attributes.is_default:true`,
    });

    if (configs.total === 0) {
      const newDefaultAgentConfig: NewAgentConfig = {
        ...DEFAULT_AGENT_CONFIG,
      };

      return this.create(soClient, newDefaultAgentConfig);
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
        revision: 1,
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
    return this._update(soClient, id, agentConfig, options?.user);
  }

  public async bumpRevision(
    soClient: SavedObjectsClientContract,
    id: string,
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentConfig> {
    return this._update(soClient, id, {}, options?.user);
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
        datasources: uniq(
          [...((oldAgentConfig.datasources || []) as string[])].concat(datasourceIds)
        ),
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
        datasources: uniq(
          [...((oldAgentConfig.datasources || []) as string[])].filter(
            dsId => !datasourceIds.includes(dsId)
          )
        ),
      },
      options?.user
    );
  }

  public async getDefaultAgentConfigId(soClient: SavedObjectsClientContract) {
    const configs = await soClient.find({
      type: AGENT_CONFIG_SAVED_OBJECT_TYPE,
      filter: `${AGENT_CONFIG_SAVED_OBJECT_TYPE}.attributes.is_default:true`,
    });

    if (configs.saved_objects.length === 0) {
      throw new Error('No default agent config');
    }

    return configs.saved_objects[0].id;
  }

  public async delete(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<DeleteAgentConfigResponse> {
    const config = await this.get(soClient, id, false);
    if (!config) {
      throw new Error('Agent configuration not found');
    }

    const defaultConfigId = await this.getDefaultAgentConfigId(soClient);
    if (id === defaultConfigId) {
      throw new Error('The default agent configuration cannot be deleted');
    }

    const { total } = await listAgents(soClient, {
      showInactive: false,
      perPage: 0,
      page: 1,
      kuery: `${AGENT_SAVED_OBJECT_TYPE}.config_id:${id}`,
    });

    if (total > 0) {
      throw new Error('Cannot delete agent config that is assigned to agent(s)');
    }

    if (config.datasources && config.datasources.length) {
      await datasourceService.delete(soClient, config.datasources as string[], {
        skipUnassignFromAgentConfigs: true,
      });
    }
    await soClient.delete(SAVED_OBJECT_TYPE, id);
    await this.triggerAgentConfigUpdatedEvent(soClient, 'deleted', id);
    return {
      id,
      success: true,
    };
  }

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
    const defaultOutput = await outputService.get(
      soClient,
      await outputService.getDefaultOutputId(soClient)
    );

    const agentConfig: FullAgentConfig = {
      id: config.id,
      outputs: {
        // TEMPORARY as we only support a default output
        ...[defaultOutput].reduce(
          (outputs, { config: outputConfig, name, type, hosts, ca_sha256, api_key }) => {
            outputs[name] = {
              type,
              hosts,
              ca_sha256,
              api_key,
              ...outputConfig,
            };
            return outputs;
          },
          {} as FullAgentConfig['outputs']
        ),
      },
      datasources: (config.datasources as Datasource[])
        .filter(datasource => datasource.enabled)
        .map(ds => storedDatasourceToAgentDatasource(ds)),
      revision: config.revision,
      ...(config.monitoring_enabled && config.monitoring_enabled.length > 0
        ? {
            settings: {
              monitoring: {
                use_output: defaultOutput.name,
                enabled: true,
                logs: config.monitoring_enabled.indexOf('logs') >= 0,
                metrics: config.monitoring_enabled.indexOf('metrics') >= 0,
              },
            },
          }
        : {
            settings: {
              monitoring: { enabled: false, logs: false, metrics: false },
            },
          }),
    };

    return agentConfig;
  }
}

export const agentConfigService = new AgentConfigService();
