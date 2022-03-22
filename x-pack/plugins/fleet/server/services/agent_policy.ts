/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, omit, isEqual } from 'lodash';
import uuid from 'uuid/v4';
import uuidv5 from 'uuid/v5';
import { safeDump } from 'js-yaml';
import pMap from 'p-map';
import type {
  ElasticsearchClient,
  SavedObjectsClientContract,
  SavedObjectsBulkUpdateResponse,
} from 'src/core/server';

import type { AuthenticatedUser } from '../../../security/server';
import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  AGENTS_PREFIX,
  PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../constants';
import type {
  PackagePolicy,
  NewAgentPolicy,
  PreconfiguredAgentPolicy,
  AgentPolicy,
  AgentPolicySOAttributes,
  FullAgentPolicy,
  ListWithKuery,
  NewPackagePolicy,
} from '../types';
import {
  agentPolicyStatuses,
  packageToPackagePolicy,
  AGENT_POLICY_INDEX,
  UUID_V5_NAMESPACE,
  FLEET_APM_PACKAGE,
} from '../../common';
import type {
  DeleteAgentPolicyResponse,
  FleetServerPolicy,
  Installation,
  Output,
  DeletePackagePoliciesResponse,
} from '../../common';
import { AgentPolicyNameExistsError, HostedAgentPolicyRestrictionRelatedError } from '../errors';

import type { FullAgentConfigMap } from '../../common/types/models/agent_cm';

import { fullAgentConfigMapToYaml } from '../../common/services/agent_cm_to_yaml';

import { elasticAgentManifest } from './elastic_agent_manifest';

import { getPackageInfo } from './epm/packages';
import { getAgentsByKuery } from './agents';
import { packagePolicyService } from './package_policy';
import { incrementPackagePolicyCopyName } from './package_policies';
import { outputService } from './output';
import { agentPolicyUpdateEventHandler } from './agent_policy_update';
import { normalizeKuery, escapeSearchQueryPhrase } from './saved_object';
import { appContextService } from './app_context';
import { getFullAgentPolicy } from './agent_policies';
import { validateOutputForPolicy } from './agent_policies';

const SAVED_OBJECT_TYPE = AGENT_POLICY_SAVED_OBJECT_TYPE;

const KEY_EDITABLE_FOR_MANAGED_POLICIES = ['namespace'];

class AgentPolicyService {
  private triggerAgentPolicyUpdatedEvent = async (
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    action: 'created' | 'updated' | 'deleted',
    agentPolicyId: string
  ) => {
    return agentPolicyUpdateEventHandler(soClient, esClient, action, agentPolicyId);
  };

  private async _update(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    agentPolicy: Partial<AgentPolicySOAttributes>,
    user?: AuthenticatedUser,
    options: { bumpRevision: boolean } = { bumpRevision: true }
  ): Promise<AgentPolicy> {
    const existingAgentPolicy = await this.get(soClient, id, true);

    if (!existingAgentPolicy) {
      throw new Error('Agent policy not found');
    }

    if (
      existingAgentPolicy.status === agentPolicyStatuses.Inactive &&
      agentPolicy.status !== agentPolicyStatuses.Active
    ) {
      throw new Error(
        `Agent policy ${id} cannot be updated because it is ${existingAgentPolicy.status}`
      );
    }

    await validateOutputForPolicy(
      soClient,
      agentPolicy,
      existingAgentPolicy,
      this.hasAPMIntegration(existingAgentPolicy)
    );

    await soClient.update<AgentPolicySOAttributes>(SAVED_OBJECT_TYPE, id, {
      ...agentPolicy,
      ...(options.bumpRevision ? { revision: existingAgentPolicy.revision + 1 } : {}),
      updated_at: new Date().toISOString(),
      updated_by: user ? user.username : 'system',
    });

    if (options.bumpRevision) {
      await this.triggerAgentPolicyUpdatedEvent(soClient, esClient, 'updated', id);
    }

    return (await this.get(soClient, id)) as AgentPolicy;
  }

  public async ensurePreconfiguredAgentPolicy(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    config: PreconfiguredAgentPolicy
  ): Promise<{
    created: boolean;
    policy?: AgentPolicy;
  }> {
    const { id, ...preconfiguredAgentPolicy } = omit(config, 'package_policies');
    const newAgentPolicyDefaults: Pick<NewAgentPolicy, 'namespace' | 'monitoring_enabled'> = {
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
    };

    const newAgentPolicy: NewAgentPolicy = {
      ...newAgentPolicyDefaults,
      ...preconfiguredAgentPolicy,
      is_preconfigured: true,
    };

    if (!id) throw new Error('Missing ID');

    return await this.ensureAgentPolicy(soClient, esClient, newAgentPolicy, id as string);
  }

  private async ensureAgentPolicy(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    newAgentPolicy: NewAgentPolicy,
    id: string
  ): Promise<{
    created: boolean;
    policy: AgentPolicy;
  }> {
    // For preconfigured policies with a specified ID
    const agentPolicy = await this.get(soClient, id, false).catch(() => null);
    if (!agentPolicy) {
      return {
        created: true,
        policy: await this.create(soClient, esClient, newAgentPolicy, { id }),
      };
    }
    return {
      created: false,
      policy: agentPolicy,
    };
  }

  public hasAPMIntegration(agentPolicy: AgentPolicy) {
    return agentPolicy.package_policies.some(
      (p) => typeof p !== 'string' && p.package?.name === FLEET_APM_PACKAGE
    );
  }

  public async create(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    agentPolicy: NewAgentPolicy,
    options?: { id?: string; user?: AuthenticatedUser }
  ): Promise<AgentPolicy> {
    await this.requireUniqueName(soClient, agentPolicy);

    await validateOutputForPolicy(soClient, agentPolicy);

    const newSo = await soClient.create<AgentPolicySOAttributes>(
      SAVED_OBJECT_TYPE,
      {
        ...agentPolicy,
        status: 'active',
        is_managed: agentPolicy.is_managed ?? false,
        revision: 1,
        updated_at: new Date().toISOString(),
        updated_by: options?.user?.username || 'system',
      } as AgentPolicy,
      options
    );

    await this.triggerAgentPolicyUpdatedEvent(soClient, esClient, 'created', newSo.id);

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

  public async getByIDs(
    soClient: SavedObjectsClientContract,
    ids: string[],
    options: { fields?: string[] } = {}
  ): Promise<AgentPolicy[]> {
    const objects = ids.map((id) => ({ ...options, id, type: SAVED_OBJECT_TYPE }));
    const agentPolicySO = await soClient.bulkGet<AgentPolicySOAttributes>(objects);

    return agentPolicySO.saved_objects.map((so) => ({
      id: so.id,
      version: so.version,
      ...so.attributes,
    }));
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

    const baseFindParams = {
      type: SAVED_OBJECT_TYPE,
      sortField,
      sortOrder,
      page,
      perPage,
    };
    const filter = kuery ? normalizeKuery(SAVED_OBJECT_TYPE, kuery) : undefined;
    let agentPoliciesSO;
    try {
      agentPoliciesSO = await soClient.find<AgentPolicySOAttributes>({ ...baseFindParams, filter });
    } catch (e) {
      const isBadRequest = e.output?.statusCode === 400;
      const isKQLSyntaxError = e.message?.startsWith('KQLSyntaxError');
      if (isBadRequest && !isKQLSyntaxError) {
        // fall back to simple search if the kuery is just a search term i.e not KQL
        agentPoliciesSO = await soClient.find<AgentPolicySOAttributes>({
          ...baseFindParams,
          search: kuery,
        });
      } else {
        throw e;
      }
    }

    const agentPolicies = await pMap(
      agentPoliciesSO.saved_objects,
      async (agentPolicySO) => {
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
      },
      { concurrency: 50 }
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
    esClient: ElasticsearchClient,
    id: string,
    agentPolicy: Partial<AgentPolicy>,
    options?: { user?: AuthenticatedUser; force?: boolean }
  ): Promise<AgentPolicy> {
    if (agentPolicy.name) {
      await this.requireUniqueName(soClient, {
        id,
        name: agentPolicy.name,
      });
    }

    const existingAgentPolicy = await this.get(soClient, id, true);

    if (!existingAgentPolicy) {
      throw new Error('Agent policy not found');
    }

    if (existingAgentPolicy.is_managed && !options?.force) {
      Object.entries(agentPolicy)
        .filter(([key]) => !KEY_EDITABLE_FOR_MANAGED_POLICIES.includes(key))
        .forEach(([key, val]) => {
          if (!isEqual(existingAgentPolicy[key as keyof AgentPolicy], val)) {
            throw new HostedAgentPolicyRestrictionRelatedError(`Cannot update ${key}`);
          }
        });
    }

    return this._update(soClient, esClient, id, agentPolicy, options?.user);
  }

  public async copy(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
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
      esClient,
      {
        namespace,
        monitoring_enabled,
        ...newAgentPolicyProps,
      },
      options
    );

    // Copy all package policies and append (copy n) to their names
    if (baseAgentPolicy.package_policies.length) {
      const newPackagePolicies = await pMap(
        baseAgentPolicy.package_policies as PackagePolicy[],
        async (packagePolicy: PackagePolicy) => {
          const { id: packagePolicyId, version, ...newPackagePolicy } = packagePolicy;

          const updatedPackagePolicy = {
            ...newPackagePolicy,
            name: await incrementPackagePolicyCopyName(soClient, packagePolicy.name),
          };
          return updatedPackagePolicy;
        }
      );
      await packagePolicyService.bulkCreate(
        soClient,
        esClient,
        newPackagePolicies,
        newAgentPolicy.id,
        {
          ...options,
          bumpRevision: false,
        }
      );
    }

    // Get updated agent policy
    const updatedAgentPolicy = await this.get(soClient, newAgentPolicy.id, true);
    if (!updatedAgentPolicy) {
      throw new Error('Copied agent policy not found');
    }

    await this.deployPolicy(soClient, newAgentPolicy.id);

    return updatedAgentPolicy;
  }

  public async bumpRevision(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    options?: { user?: AuthenticatedUser }
  ): Promise<AgentPolicy> {
    const res = await this._update(soClient, esClient, id, {}, options?.user);

    return res;
  }

  /**
   * Remove an output from all agent policies that are using it, and replace the output by the default ones.
   * @param soClient
   * @param esClient
   * @param outputId
   */
  public async removeOutputFromAll(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    outputId: string
  ) {
    const agentPolicies = (
      await soClient.find<AgentPolicySOAttributes>({
        type: SAVED_OBJECT_TYPE,
        fields: ['revision', 'data_output_id', 'monitoring_output_id'],
        searchFields: ['data_output_id', 'monitoring_output_id'],
        search: escapeSearchQueryPhrase(outputId),
        perPage: SO_SEARCH_LIMIT,
      })
    ).saved_objects.map((so) => ({
      id: so.id,
      ...so.attributes,
    }));

    if (agentPolicies.length > 0) {
      await pMap(
        agentPolicies,
        (agentPolicy) =>
          this.update(soClient, esClient, agentPolicy.id, {
            data_output_id:
              agentPolicy.data_output_id === outputId ? null : agentPolicy.data_output_id,
            monitoring_output_id:
              agentPolicy.monitoring_output_id === outputId
                ? null
                : agentPolicy.monitoring_output_id,
          }),
        {
          concurrency: 50,
        }
      );
    }
  }

  public async bumpAllAgentPoliciesForOutput(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    outputId: string,
    options?: { user?: AuthenticatedUser }
  ): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>> {
    const currentPolicies = await soClient.find<AgentPolicySOAttributes>({
      type: SAVED_OBJECT_TYPE,
      fields: ['revision', 'data_output_id', 'monitoring_output_id'],
      searchFields: ['data_output_id', 'monitoring_output_id'],
      search: escapeSearchQueryPhrase(outputId),
      perPage: SO_SEARCH_LIMIT,
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
    await pMap(
      currentPolicies.saved_objects,
      (policy) => this.triggerAgentPolicyUpdatedEvent(soClient, esClient, 'updated', policy.id),
      { concurrency: 50 }
    );

    return res;
  }

  public async bumpAllAgentPolicies(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    options?: { user?: AuthenticatedUser }
  ): Promise<SavedObjectsBulkUpdateResponse<AgentPolicy>> {
    const currentPolicies = await soClient.find<AgentPolicySOAttributes>({
      type: SAVED_OBJECT_TYPE,
      fields: ['revision'],
      perPage: SO_SEARCH_LIMIT,
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

    await pMap(
      currentPolicies.saved_objects,
      (policy) => this.triggerAgentPolicyUpdatedEvent(soClient, esClient, 'updated', policy.id),
      { concurrency: 50 }
    );

    return res;
  }

  public async assignPackagePolicies(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    packagePolicyIds: string[],
    options: { user?: AuthenticatedUser; bumpRevision: boolean; force?: boolean } = {
      bumpRevision: true,
    }
  ): Promise<AgentPolicy> {
    const oldAgentPolicy = await this.get(soClient, id, false);

    if (!oldAgentPolicy) {
      throw new Error('Agent policy not found');
    }

    if (oldAgentPolicy.is_managed && !options?.force) {
      throw new HostedAgentPolicyRestrictionRelatedError(
        `Cannot update integrations of hosted agent policy ${id}`
      );
    }

    return await this._update(
      soClient,
      esClient,
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
    esClient: ElasticsearchClient,
    id: string,
    packagePolicyIds: string[],
    options?: { user?: AuthenticatedUser; force?: boolean }
  ): Promise<AgentPolicy> {
    const oldAgentPolicy = await this.get(soClient, id, false);

    if (!oldAgentPolicy) {
      throw new Error('Agent policy not found');
    }

    if (oldAgentPolicy.is_managed && !options?.force) {
      throw new HostedAgentPolicyRestrictionRelatedError(
        `Cannot remove integrations of hosted agent policy ${id}`
      );
    }

    return await this._update(
      soClient,
      esClient,
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

  public async delete(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    options?: { force?: boolean; removeFleetServerDocuments?: boolean }
  ): Promise<DeleteAgentPolicyResponse> {
    const agentPolicy = await this.get(soClient, id, false);
    if (!agentPolicy) {
      throw new Error('Agent policy not found');
    }

    if (agentPolicy.is_managed && !options?.force) {
      throw new HostedAgentPolicyRestrictionRelatedError(`Cannot delete hosted agent policy ${id}`);
    }

    const { total } = await getAgentsByKuery(esClient, {
      showInactive: false,
      perPage: 0,
      page: 1,
      kuery: `${AGENTS_PREFIX}.policy_id:${id}`,
    });

    if (total > 0) {
      throw new Error('Cannot delete agent policy that is assigned to agent(s)');
    }

    if (agentPolicy.package_policies && agentPolicy.package_policies.length) {
      const deletedPackagePolicies: DeletePackagePoliciesResponse =
        await packagePolicyService.delete(
          soClient,
          esClient,
          agentPolicy.package_policies as string[],
          {
            force: options?.force,
            skipUnassignFromAgentPolicies: true,
          }
        );
      try {
        await packagePolicyService.runDeleteExternalCallbacks(deletedPackagePolicies);
      } catch (error) {
        const logger = appContextService.getLogger();
        logger.error(`An error occurred executing external callback: ${error}`);
        logger.error(error);
      }
    }

    if (agentPolicy.is_preconfigured && !options?.force) {
      await soClient.create(PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE, {
        id: String(id),
      });
    }

    await soClient.delete(SAVED_OBJECT_TYPE, id);
    await this.triggerAgentPolicyUpdatedEvent(soClient, esClient, 'deleted', id);

    if (options?.removeFleetServerDocuments) {
      await this.deleteFleetServerPoliciesForPolicyId(esClient, id);
    }

    return {
      id,
      name: agentPolicy.name,
    };
  }

  public async deployPolicy(soClient: SavedObjectsClientContract, agentPolicyId: string) {
    // Use internal ES client so we have permissions to write to .fleet* indices
    const esClient = appContextService.getInternalUserESClient();
    const defaultOutputId = await outputService.getDefaultDataOutputId(soClient);

    if (!defaultOutputId) {
      return;
    }

    const policy = await agentPolicyService.get(soClient, agentPolicyId);
    const fullPolicy = await agentPolicyService.getFullAgentPolicy(soClient, agentPolicyId);
    if (!policy || !fullPolicy || !fullPolicy.revision) {
      return;
    }

    const fleetServerPolicy: FleetServerPolicy = {
      '@timestamp': new Date().toISOString(),
      revision_idx: fullPolicy.revision,
      coordinator_idx: 0,
      data: fullPolicy as unknown as FleetServerPolicy['data'],
      policy_id: fullPolicy.id,
      default_fleet_server: policy.is_default_fleet_server === true,
    };

    if (policy.unenroll_timeout) {
      fleetServerPolicy.unenroll_timeout = policy.unenroll_timeout;
    }

    await esClient.create({
      index: AGENT_POLICY_INDEX,
      body: fleetServerPolicy,
      id: uuid(),
      refresh: 'wait_for',
    });
  }

  public async deleteFleetServerPoliciesForPolicyId(
    esClient: ElasticsearchClient,
    agentPolicyId: string
  ) {
    await esClient.deleteByQuery({
      index: AGENT_POLICY_INDEX,
      ignore_unavailable: true,
      body: {
        query: {
          term: {
            policy_id: agentPolicyId,
          },
        },
      },
    });
  }

  public async getLatestFleetPolicy(esClient: ElasticsearchClient, agentPolicyId: string) {
    const res = await esClient.search({
      index: AGENT_POLICY_INDEX,
      ignore_unavailable: true,
      rest_total_hits_as_int: true,
      body: {
        query: {
          term: {
            policy_id: agentPolicyId,
          },
        },
        size: 1,
        sort: [{ revision_idx: { order: 'desc' } }],
      },
    });

    if ((res.hits.total as number) === 0) {
      return null;
    }

    return res.hits.hits[0]._source;
  }

  public async getFullAgentConfigMap(
    soClient: SavedObjectsClientContract,
    id: string,
    options?: { standalone: boolean }
  ): Promise<string | null> {
    const fullAgentPolicy = await getFullAgentPolicy(soClient, id, options);
    if (fullAgentPolicy) {
      const fullAgentConfigMap: FullAgentConfigMap = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: 'agent-node-datastreams',
          namespace: 'kube-system',
          labels: {
            'k8s-app': 'elastic-agent',
          },
        },
        data: {
          'agent.yml': fullAgentPolicy,
        },
      };

      const configMapYaml = fullAgentConfigMapToYaml(fullAgentConfigMap, safeDump);
      const updateManifestVersion = elasticAgentManifest.replace(
        'VERSION',
        appContextService.getKibanaVersion()
      );
      const fixedAgentYML = configMapYaml.replace('agent.yml:', 'agent.yml: |-');
      return [fixedAgentYML, updateManifestVersion].join('\n');
    } else {
      return '';
    }
  }

  public async getFullAgentPolicy(
    soClient: SavedObjectsClientContract,
    id: string,
    options?: { standalone: boolean }
  ): Promise<FullAgentPolicy | null> {
    return getFullAgentPolicy(soClient, id, options);
  }
}

export const agentPolicyService = new AgentPolicyService();

export async function addPackageToAgentPolicy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  packageToInstall: Installation,
  agentPolicy: AgentPolicy,
  defaultOutput: Output,
  packagePolicyName?: string,
  packagePolicyId?: string | number,
  packagePolicyDescription?: string,
  transformPackagePolicy?: (p: NewPackagePolicy) => NewPackagePolicy,
  bumpAgentPolicyRevison = false
) {
  const packageInfo = await getPackageInfo({
    savedObjectsClient: soClient,
    pkgName: packageToInstall.name,
    pkgVersion: packageToInstall.version,
  });

  const basePackagePolicy = packageToPackagePolicy(
    packageInfo,
    agentPolicy.id,
    defaultOutput.id,
    agentPolicy.namespace ?? 'default',
    packagePolicyName,
    packagePolicyDescription
  );

  const newPackagePolicy = transformPackagePolicy
    ? transformPackagePolicy(basePackagePolicy)
    : basePackagePolicy;

  // If an ID is provided via preconfiguration, use that value. Otherwise fall back to
  // a UUID v5 value seeded from the agent policy's ID and the provided package policy name.
  const id = packagePolicyId
    ? String(packagePolicyId)
    : uuidv5(`${agentPolicy.id}-${packagePolicyName}`, UUID_V5_NAMESPACE);

  await packagePolicyService.create(soClient, esClient, newPackagePolicy, {
    id,
    bumpRevision: bumpAgentPolicyRevison,
    skipEnsureInstalled: true,
    skipUniqueNameVerification: true,
    overwrite: true,
    force: true, // To add package to managed policy we need the force flag
  });
}
