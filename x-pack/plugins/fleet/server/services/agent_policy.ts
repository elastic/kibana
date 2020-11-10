/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { uniq } from 'lodash';
import { safeLoad } from 'js-yaml';
import { SavedObjectsClientContract, SavedObjectsBulkUpdateResponse } from 'src/core/server';
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
  ListWithKuery,
} from '../types';
import {
  DeleteAgentPolicyResponse,
  Settings,
  agentPolicyStatuses,
  storedPackagePoliciesToAgentInputs,
  dataTypes,
} from '../../common';
import { AgentPolicyNameExistsError } from '../errors';
import { createAgentPolicyAction, listAgents } from './agents';
import { packagePolicyService } from './package_policy';
import { outputService } from './output';
import { agentPolicyUpdateEventHandler } from './agent_policy_update';
import { getSettings } from './settings';
import { normalizeKuery, escapeSearchQueryPhrase } from './saved_object';
import { getFullAgentPolicyKibanaConfig } from '../../common/services/full_agent_policy_kibana_config';
import { isAgentsSetup } from './agents/setup';

const SAVED_OBJECT_TYPE = AGENT_POLICY_SAVED_OBJECT_TYPE;

class AgentPolicyService {
  private triggerAgentPolicyUpdatedEvent = async (
    soClient: SavedObjectsClientContract,
    action: 'created' | 'updated' | 'deleted',
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
      oldAgentPolicy.status === agentPolicyStatuses.Inactive &&
      agentPolicy.status !== agentPolicyStatuses.Active
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

    if (options.bumpRevision) {
      await this.triggerAgentPolicyUpdatedEvent(soClient, 'updated', id);
    }

    return (await this.get(soClient, id)) as AgentPolicy;
  }

  public async ensureDefaultAgentPolicy(
    soClient: SavedObjectsClientContract
  ): Promise<{
    created: boolean;
    defaultAgentPolicy: AgentPolicy;
  }> {
    const agentPolicies = await soClient.find<AgentPolicySOAttributes>({
      type: AGENT_POLICY_SAVED_OBJECT_TYPE,
      searchFields: ['is_default'],
      search: 'true',
    });

    if (agentPolicies.total === 0) {
      const newDefaultAgentPolicy: NewAgentPolicy = {
        ...DEFAULT_AGENT_POLICY,
      };

      return {
        created: true,
        defaultAgentPolicy: await this.create(soClient, newDefaultAgentPolicy),
      };
    }

    return {
      created: false,
      defaultAgentPolicy: {
        id: agentPolicies.saved_objects[0].id,
        ...agentPolicies.saved_objects[0].attributes,
      },
    };
  }

  public async create(
    soClient: SavedObjectsClientContract,
    agentPolicy: NewAgentPolicy,
    options?: { id?: string; user?: AuthenticatedUser }
  ): Promise<AgentPolicy> {
    await this.requireUniqueName(soClient, agentPolicy);
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

  public async requireUniqueName(
    soClient: SavedObjectsClientContract,
    givenPolicy: { id?: string; name: string }
  ) {
    const results = await soClient.find<AgentPolicySOAttributes>({
      type: SAVED_OBJECT_TYPE,
      searchFields: ['name'],
      search: escapeSearchQueryPhrase(givenPolicy.name),
    });
    const idsWithName = results.total && results.saved_objects.map(({ id }) => id);
    if (Array.isArray(idsWithName)) {
      const isEditingSelf = givenPolicy.id && idsWithName.includes(givenPolicy.id);
      if (!givenPolicy.id || !isEditingSelf) {
        const isSinglePolicy = idsWithName.length === 1;
        const existClause = isSinglePolicy
          ? `Agent Policy '${idsWithName[0]}' already exists`
          : `Agent Policies '${idsWithName.join(',')}' already exist`;

        throw new AgentPolicyNameExistsError(`${existClause} with name '${givenPolicy.name}'`);
      }
    }
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
      filter: kuery ? normalizeKuery(SAVED_OBJECT_TYPE, kuery) : undefined,
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
    if (agentPolicy.name) {
      await this.requireUniqueName(soClient, {
        id,
        name: agentPolicy.name,
      });
    }
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

    await this.createFleetPolicyChangeAction(soClient, newAgentPolicy.id);

    return updatedAgentPolicy;
  }

  public async bumpRevision(
    soClient: SavedObjectsClientContract,
    id: string,
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentPolicy> {
    const res = await this._update(soClient, id, {}, options?.user);

    return res;
  }
  public async bumpAllAgentPolicies(
    soClient: SavedObjectsClientContract,
    options?: { user?: AuthenticatedUser }
  ): Promise<Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>>> {
    const currentPolicies = await soClient.find<AgentPolicySOAttributes>({
      type: SAVED_OBJECT_TYPE,
      fields: ['revision'],
    });
    const bumpedPolicies = currentPolicies.saved_objects.map((policy) => {
      policy.attributes = {
        ...policy.attributes,
        revision: policy.attributes.revision + 1,
        updated_at: new Date().toISOString(),
        updated_by: options?.user ? options.user.username : 'system',
      };
      return policy;
    });
    const res = await soClient.bulkUpdate<AgentPolicySOAttributes>(bumpedPolicies);

    await Promise.all(
      currentPolicies.saved_objects.map((policy) =>
        this.triggerAgentPolicyUpdatedEvent(soClient, 'updated', policy.id)
      )
    );

    return res;
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

    const {
      defaultAgentPolicy: { id: defaultAgentPolicyId },
    } = await this.ensureDefaultAgentPolicy(soClient);
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
      name: agentPolicy.name,
    };
  }

  public async createFleetPolicyChangeAction(
    soClient: SavedObjectsClientContract,
    agentPolicyId: string
  ) {
    // If Agents is not setup skip the creation of POLICY_CHANGE agent actions
    // the action will be created during the fleet setup
    if (!(await isAgentsSetup(soClient))) {
      return;
    }
    const policy = await agentPolicyService.getFullAgentPolicy(soClient, agentPolicyId);
    if (!policy || !policy.revision) {
      return;
    }
    const packages = policy.inputs.reduce<string[]>((acc, input) => {
      const packageName = input.meta?.package?.name;
      if (packageName && acc.indexOf(packageName) < 0) {
        acc.push(packageName);
      }
      return acc;
    }, []);

    await createAgentPolicyAction(soClient, {
      type: 'POLICY_CHANGE',
      data: { policy },
      ack_data: { packages },
      created_at: new Date().toISOString(),
      policy_id: policy.id,
      policy_revision: policy.revision,
    });
  }

  public async getFullAgentPolicy(
    soClient: SavedObjectsClientContract,
    id: string,
    options?: { standalone: boolean }
  ): Promise<FullAgentPolicy | null> {
    let agentPolicy;
    const standalone = options?.standalone;

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
          (outputs, { config_yaml, name, type, hosts, ca_sha256, api_key }) => {
            const configJs = config_yaml ? safeLoad(config_yaml) : {};
            outputs[name] = {
              type,
              hosts,
              ca_sha256,
              api_key,
              ...configJs,
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
                logs: agentPolicy.monitoring_enabled.includes(dataTypes.Logs),
                metrics: agentPolicy.monitoring_enabled.includes(dataTypes.Metrics),
              },
            },
          }
        : {
            agent: {
              monitoring: { enabled: false, logs: false, metrics: false },
            },
          }),
    };

    // only add settings if not in standalone
    if (!standalone) {
      let settings: Settings;
      try {
        settings = await getSettings(soClient);
      } catch (error) {
        throw new Error('Default settings is not setup');
      }
      if (!settings.kibana_urls || !settings.kibana_urls.length)
        throw new Error('kibana_urls is missing');

      fullAgentPolicy.fleet = {
        kibana: getFullAgentPolicyKibanaConfig(settings.kibana_urls),
      };
    }
    return fullAgentPolicy;
  }
}
export type AgentPolicyServiceInterface = Omit<
  AgentPolicyService,
  'triggerAgentPolicyUpdatedEvent' | '_update'
>;
export const agentPolicyService = new AgentPolicyService();
