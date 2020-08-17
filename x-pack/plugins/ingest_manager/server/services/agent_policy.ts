/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { uniq } from 'lodash';
import { SavedObjectsClientContract } from 'src/core/server';
import { AuthenticatedUser } from '../../../security/server';
import {
  DEFAULT_AGENT_POLICY,
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
} from '../constants';
import {
  PackagePolicy,
  NewAgentPolicy,
  AgentPolicy,
  AgentPolicySOAttributes,
  FullAgentPolicy,
  AgentPolicyStatus,
  ListWithKuery,
} from '../types';
import { DeleteAgentPolicyResponse, storedPackagePoliciesToAgentInputs } from '../../common';
import { listAgents } from './agents';
import { packagePolicyService } from './package_policy';
import { outputService } from './output';
import { agentPolicyUpdateEventHandler } from './agent_policy_update';

const SAVED_OBJECT_TYPE = AGENT_POLICY_SAVED_OBJECT_TYPE;

class AgentPolicyService {
  private triggerAgentPolicyUpdatedEvent = async (
    soClient: SavedObjectsClientContract,
    action: string,
    agentPolicyId: string
  ) => {
    return agentPolicyUpdateEventHandler(soClient, action, agentPolicyId);
  };

  private async _update(
    soClient: SavedObjectsClientContract,
    id: string,
    agentPolicy: Partial<AgentPolicySOAttributes>,
    user?: AuthenticatedUser,
    options: { bumpRevision: boolean } = { bumpRevision: true }
  ): Promise<AgentPolicy> {
    const oldAgentPolicy = await this.get(soClient, id, false);

    if (!oldAgentPolicy) {
      throw new Error('Agent policy not found');
    }

    if (
      oldAgentPolicy.status === AgentPolicyStatus.Inactive &&
      agentPolicy.status !== AgentPolicyStatus.Active
    ) {
      throw new Error(
        `Agent policy ${id} cannot be updated because it is ${oldAgentPolicy.status}`
      );
    }

    await soClient.update<AgentPolicySOAttributes>(SAVED_OBJECT_TYPE, id, {
      ...agentPolicy,
      ...(options.bumpRevision ? { revision: oldAgentPolicy.revision + 1 } : {}),
      updated_at: new Date().toISOString(),
      updated_by: user ? user.username : 'system',
    });

    return (await this.get(soClient, id)) as AgentPolicy;
  }

  public async ensureDefaultAgentPolicy(soClient: SavedObjectsClientContract) {
    const agentPolicies = await soClient.find<AgentPolicySOAttributes>({
      type: AGENT_POLICY_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
    });

    if (agentPolicies.total === 0) {
      const newDefaultAgentPolicy: NewAgentPolicy = {
        ...DEFAULT_AGENT_POLICY,
      };

      return this.create(soClient, newDefaultAgentPolicy);
    }

    return {
      id: agentPolicies.saved_objects[0].id,
      ...agentPolicies.saved_objects[0].attributes,
    };
  }

  public async create(
    soClient: SavedObjectsClientContract,
    agentPolicy: NewAgentPolicy,
    options?: { id?: string; user?: AuthenticatedUser }
  ): Promise<AgentPolicy> {
    const newSo = await soClient.create<AgentPolicySOAttributes>(
      SAVED_OBJECT_TYPE,
      {
        ...agentPolicy,
        revision: 1,
        updated_at: new Date().toISOString(),
        updated_by: options?.user?.username || 'system',
      } as AgentPolicy,
      options
    );

    if (!agentPolicy.is_default) {
      await this.triggerAgentPolicyUpdatedEvent(soClient, 'created', newSo.id);
    }

    return { id: newSo.id, ...newSo.attributes };
  }

  public async get(
    soClient: SavedObjectsClientContract,
    id: string,
    withPackagePolicies: boolean = true
  ): Promise<AgentPolicy | null> {
    const agentPolicySO = await soClient.get<AgentPolicySOAttributes>(SAVED_OBJECT_TYPE, id);
    if (!agentPolicySO) {
      return null;
    }

    if (agentPolicySO.error) {
      throw new Error(agentPolicySO.error.message);
    }

    const agentPolicy = { id: agentPolicySO.id, ...agentPolicySO.attributes };

    if (withPackagePolicies) {
      agentPolicy.package_policies =
        (await packagePolicyService.getByIDs(
          soClient,
          (agentPolicySO.attributes.package_policies as string[]) || []
        )) || [];
    }

    return agentPolicy;
  }

  public async list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery & {
      withPackagePolicies?: boolean;
    }
  ): Promise<{ items: AgentPolicy[]; total: number; page: number; perPage: number }> {
    const {
      page = 1,
      perPage = 20,
      sortField = 'updated_at',
      sortOrder = 'desc',
      kuery,
      withPackagePolicies = false,
    } = options;

    const agentPoliciesSO = await soClient.find<AgentPolicySOAttributes>({
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

    const agentPolicies = await Promise.all(
      agentPoliciesSO.saved_objects.map(async (agentPolicySO) => {
        const agentPolicy = {
          id: agentPolicySO.id,
          ...agentPolicySO.attributes,
        };
        if (withPackagePolicies) {
          const agentPolicyWithPackagePolicies = await this.get(
            soClient,
            agentPolicySO.id,
            withPackagePolicies
          );
          if (agentPolicyWithPackagePolicies) {
            agentPolicy.package_policies = agentPolicyWithPackagePolicies.package_policies;
          }
        }
        return agentPolicy;
      })
    );

    return {
      items: agentPolicies,
      total: agentPoliciesSO.total,
      page,
      perPage,
    };
  }

  public async update(
    soClient: SavedObjectsClientContract,
    id: string,
    agentPolicy: Partial<AgentPolicy>,
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentPolicy> {
    return this._update(soClient, id, agentPolicy, options?.user);
  }

  public async copy(
    soClient: SavedObjectsClientContract,
    id: string,
    newAgentPolicyProps: Pick<AgentPolicy, 'name' | 'description'>,
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentPolicy> {
    // Copy base agent policy
    const baseAgentPolicy = await this.get(soClient, id, true);
    if (!baseAgentPolicy) {
      throw new Error('Agent policy not found');
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { namespace, monitoring_enabled } = baseAgentPolicy;
    const newAgentPolicy = await this.create(
      soClient,
      {
        namespace,
        monitoring_enabled,
        ...newAgentPolicyProps,
      },
      options
    );

    // Copy all package policies
    if (baseAgentPolicy.package_policies.length) {
      const newPackagePolicies = (baseAgentPolicy.package_policies as PackagePolicy[]).map(
        (packagePolicy: PackagePolicy) => {
          const { id: packagePolicyId, version, ...newPackagePolicy } = packagePolicy;
          return newPackagePolicy;
        }
      );
      await packagePolicyService.bulkCreate(soClient, newPackagePolicies, newAgentPolicy.id, {
        ...options,
        bumpRevision: false,
      });
    }

    // Get updated agent policy
    const updatedAgentPolicy = await this.get(soClient, newAgentPolicy.id, true);
    if (!updatedAgentPolicy) {
      throw new Error('Copied agent policy not found');
    }

    return updatedAgentPolicy;
  }

  public async bumpRevision(
    soClient: SavedObjectsClientContract,
    id: string,
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentPolicy> {
    return this._update(soClient, id, {}, options?.user);
  }

  public async assignPackagePolicies(
    soClient: SavedObjectsClientContract,
    id: string,
    packagePolicyIds: string[],
    options: { user?: AuthenticatedUser; bumpRevision: boolean } = { bumpRevision: true }
  ): Promise<AgentPolicy> {
    const oldAgentPolicy = await this.get(soClient, id, false);

    if (!oldAgentPolicy) {
      throw new Error('Agent policy not found');
    }

    return await this._update(
      soClient,
      id,
      {
        package_policies: uniq(
          [...((oldAgentPolicy.package_policies || []) as string[])].concat(packagePolicyIds)
        ),
      },
      options?.user,
      { bumpRevision: options.bumpRevision }
    );
  }

  public async unassignPackagePolicies(
    soClient: SavedObjectsClientContract,
    id: string,
    packagePolicyIds: string[],
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentPolicy> {
    const oldAgentPolicy = await this.get(soClient, id, false);

    if (!oldAgentPolicy) {
      throw new Error('Agent policy not found');
    }

    return await this._update(
      soClient,
      id,
      {
        package_policies: uniq(
          [...((oldAgentPolicy.package_policies || []) as string[])].filter(
            (packagePolicyId) => !packagePolicyIds.includes(packagePolicyId)
          )
        ),
      },
      options?.user
    );
  }

  public async getDefaultAgentPolicyId(soClient: SavedObjectsClientContract) {
    const agentPolicies = await soClient.find({
      type: AGENT_POLICY_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
    });

    if (agentPolicies.saved_objects.length === 0) {
      throw new Error('No default agent policy');
    }

    return agentPolicies.saved_objects[0].id;
  }

  public async delete(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<DeleteAgentPolicyResponse> {
    const agentPolicy = await this.get(soClient, id, false);
    if (!agentPolicy) {
      throw new Error('Agent policy not found');
    }

    const { id: defaultAgentPolicyId } = await this.ensureDefaultAgentPolicy(soClient);
    if (id === defaultAgentPolicyId) {
      throw new Error('The default agent policy cannot be deleted');
    }

    const { total } = await listAgents(soClient, {
      showInactive: false,
      perPage: 0,
      page: 1,
      kuery: `${AGENT_SAVED_OBJECT_TYPE}.policy_id:${id}`,
    });

    if (total > 0) {
      throw new Error('Cannot delete agent policy that is assigned to agent(s)');
    }

    if (agentPolicy.package_policies && agentPolicy.package_policies.length) {
      await packagePolicyService.delete(soClient, agentPolicy.package_policies as string[], {
        skipUnassignFromAgentPolicies: true,
      });
    }
    await soClient.delete(SAVED_OBJECT_TYPE, id);
    await this.triggerAgentPolicyUpdatedEvent(soClient, 'deleted', id);
    return {
      id,
      success: true,
    };
  }

  public async getFullAgentPolicy(
    soClient: SavedObjectsClientContract,
    id: string,
    options?: { standalone: boolean }
  ): Promise<FullAgentPolicy | null> {
    let agentPolicy;

    try {
      agentPolicy = await this.get(soClient, id);
    } catch (err) {
      if (!err.isBoom || err.output.statusCode !== 404) {
        throw err;
      }
    }

    if (!agentPolicy) {
      return null;
    }

    const defaultOutputId = await outputService.getDefaultOutputId(soClient);
    if (!defaultOutputId) {
      throw new Error('Default output is not setup');
    }
    const defaultOutput = await outputService.get(soClient, defaultOutputId);

    const fullAgentPolicy: FullAgentPolicy = {
      id: agentPolicy.id,
      outputs: {
        // TEMPORARY as we only support a default output
        ...[defaultOutput].reduce(
          // eslint-disable-next-line @typescript-eslint/naming-convention
          (outputs, { config: outputConfig, name, type, hosts, ca_sha256, api_key }) => {
            outputs[name] = {
              type,
              hosts,
              ca_sha256,
              api_key,
              ...outputConfig,
            };

            if (options?.standalone) {
              delete outputs[name].api_key;
              outputs[name].username = 'ES_USERNAME';
              outputs[name].password = 'ES_PASSWORD';
            }

            return outputs;
          },
          {} as FullAgentPolicy['outputs']
        ),
      },
      inputs: storedPackagePoliciesToAgentInputs(agentPolicy.package_policies as PackagePolicy[]),
      revision: agentPolicy.revision,
      ...(agentPolicy.monitoring_enabled && agentPolicy.monitoring_enabled.length > 0
        ? {
            agent: {
              monitoring: {
                use_output: defaultOutput.name,
                enabled: true,
                logs: agentPolicy.monitoring_enabled.indexOf('logs') >= 0,
                metrics: agentPolicy.monitoring_enabled.indexOf('metrics') >= 0,
              },
            },
          }
        : {
            agent: {
              monitoring: { enabled: false, logs: false, metrics: false },
            },
          }),
    };

    return fullAgentPolicy;
  }
}

export const agentPolicyService = new AgentPolicyService();
