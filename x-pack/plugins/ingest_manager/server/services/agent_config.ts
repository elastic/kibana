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
  PackageConfig,
  NewAgentConfig,
  AgentConfig,
  AgentConfigSOAttributes,
  FullAgentConfig,
  AgentConfigStatus,
  ListWithKuery,
} from '../types';
import { DeleteAgentConfigResponse, storedPackageConfigsToAgentInputs } from '../../common';
import { listAgents } from './agents';
import { packageConfigService } from './package_config';
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
    agentConfig: Partial<AgentConfigSOAttributes>,
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

    await soClient.update<AgentConfigSOAttributes>(SAVED_OBJECT_TYPE, id, {
      ...agentConfig,
      revision: oldAgentConfig.revision + 1,
      updated_at: new Date().toISOString(),
      updated_by: user ? user.username : 'system',
    });

    return (await this.get(soClient, id)) as AgentConfig;
  }

  public async ensureDefaultAgentConfig(soClient: SavedObjectsClientContract) {
    const configs = await soClient.find<AgentConfigSOAttributes>({
      type: AGENT_CONFIG_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
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
    const newSo = await soClient.create<AgentConfigSOAttributes>(
      SAVED_OBJECT_TYPE,
      {
        ...agentConfig,
        revision: 1,
        updated_at: new Date().toISOString(),
        updated_by: options?.user?.username || 'system',
      } as AgentConfig,
      options
    );

    if (!agentConfig.is_default) {
      await this.triggerAgentConfigUpdatedEvent(soClient, 'created', newSo.id);
    }

    return { id: newSo.id, ...newSo.attributes };
  }

  public async get(
    soClient: SavedObjectsClientContract,
    id: string,
    withPackageConfigs: boolean = true
  ): Promise<AgentConfig | null> {
    const agentConfigSO = await soClient.get<AgentConfigSOAttributes>(SAVED_OBJECT_TYPE, id);
    if (!agentConfigSO) {
      return null;
    }

    if (agentConfigSO.error) {
      throw new Error(agentConfigSO.error.message);
    }

    const agentConfig = { id: agentConfigSO.id, ...agentConfigSO.attributes };

    if (withPackageConfigs) {
      agentConfig.package_configs =
        (await packageConfigService.getByIDs(
          soClient,
          (agentConfigSO.attributes.package_configs as string[]) || []
        )) || [];
    }

    return agentConfig;
  }

  public async list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery & {
      withPackageConfigs?: boolean;
    }
  ): Promise<{ items: AgentConfig[]; total: number; page: number; perPage: number }> {
    const {
      page = 1,
      perPage = 20,
      sortField = 'updated_at',
      sortOrder = 'desc',
      kuery,
      withPackageConfigs = false,
    } = options;

    const agentConfigsSO = await soClient.find<AgentConfigSOAttributes>({
      type: SAVED_OBJECT_TYPE,
      sortField,
      sortOrder,
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

    const agentConfigs = await Promise.all(
      agentConfigsSO.saved_objects.map(async (agentConfigSO) => {
        const agentConfig = {
          id: agentConfigSO.id,
          ...agentConfigSO.attributes,
        };
        if (withPackageConfigs) {
          const agentConfigWithPackageConfigs = await this.get(
            soClient,
            agentConfigSO.id,
            withPackageConfigs
          );
          if (agentConfigWithPackageConfigs) {
            agentConfig.package_configs = agentConfigWithPackageConfigs.package_configs;
          }
        }
        return agentConfig;
      })
    );

    return {
      items: agentConfigs,
      total: agentConfigsSO.total,
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

  public async copy(
    soClient: SavedObjectsClientContract,
    id: string,
    newAgentConfigProps: Pick<AgentConfig, 'name' | 'description'>,
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentConfig> {
    // Copy base config
    const baseAgentConfig = await this.get(soClient, id, true);
    if (!baseAgentConfig) {
      throw new Error('Agent config not found');
    }
    const { namespace, monitoring_enabled } = baseAgentConfig;
    const newAgentConfig = await this.create(
      soClient,
      {
        namespace,
        monitoring_enabled,
        ...newAgentConfigProps,
      },
      options
    );

    // Copy all package configs
    if (baseAgentConfig.package_configs.length) {
      const newPackageConfigs = (baseAgentConfig.package_configs as PackageConfig[]).map(
        (packageConfig: PackageConfig) => {
          const { id: packageConfigId, ...newPackageConfig } = packageConfig;
          return newPackageConfig;
        }
      );
      await packageConfigService.bulkCreate(
        soClient,
        newPackageConfigs,
        newAgentConfig.id,
        options
      );
    }

    // Get updated config
    const updatedAgentConfig = await this.get(soClient, newAgentConfig.id, true);
    if (!updatedAgentConfig) {
      throw new Error('Copied agent config not found');
    }

    return updatedAgentConfig;
  }

  public async bumpRevision(
    soClient: SavedObjectsClientContract,
    id: string,
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentConfig> {
    return this._update(soClient, id, {}, options?.user);
  }

  public async assignPackageConfigs(
    soClient: SavedObjectsClientContract,
    id: string,
    packageConfigIds: string[],
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
        package_configs: uniq(
          [...((oldAgentConfig.package_configs || []) as string[])].concat(packageConfigIds)
        ),
      },
      options?.user
    );
  }

  public async unassignPackageConfigs(
    soClient: SavedObjectsClientContract,
    id: string,
    packageConfigIds: string[],
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
        package_configs: uniq(
          [...((oldAgentConfig.package_configs || []) as string[])].filter(
            (pkgConfigId) => !packageConfigIds.includes(pkgConfigId)
          )
        ),
      },
      options?.user
    );
  }

  public async getDefaultAgentConfigId(soClient: SavedObjectsClientContract) {
    const configs = await soClient.find({
      type: AGENT_CONFIG_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
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

    if (config.package_configs && config.package_configs.length) {
      await packageConfigService.delete(soClient, config.package_configs as string[], {
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

    const defaultOutputId = await outputService.getDefaultOutputId(soClient);
    if (!defaultOutputId) {
      throw new Error('Default output is not setup');
    }
    const defaultOutput = await outputService.get(soClient, defaultOutputId);

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
      inputs: storedPackageConfigsToAgentInputs(config.package_configs as PackageConfig[]),
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
