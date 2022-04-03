/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, partition, isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import semverLt from 'semver/functions/lt';
import { getFlattenedObject } from '@kbn/std';
import type { KibanaRequest } from 'src/core/server';
import type {
  ElasticsearchClient,
  RequestHandlerContext,
  SavedObjectsClientContract,
} from 'src/core/server';
import uuid from 'uuid';
import { safeLoad } from 'js-yaml';

import { DEFAULT_SPACE_ID } from '../../../spaces/common/constants';

import type { AuthenticatedUser } from '../../../security/server';
import {
  packageToPackagePolicy,
  packageToPackagePolicyInputs,
  isPackageLimited,
  doesAgentPolicyAlreadyIncludePackage,
  validatePackagePolicy,
  validationHasErrors,
  SO_SEARCH_LIMIT,
  FLEET_APM_PACKAGE,
  outputType,
} from '../../common';
import type {
  DeletePackagePoliciesResponse,
  UpgradePackagePolicyResponse,
  PackagePolicyInput,
  NewPackagePolicyInput,
  PackagePolicyConfigRecordEntry,
  PackagePolicyInputStream,
  PackageInfo,
  ListWithKuery,
  ListResult,
  UpgradePackagePolicyDryRunResponseItem,
  RegistryDataStream,
  PackagePolicyPackage,
} from '../../common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../constants';
import {
  IngestManagerError,
  ingestErrorToResponseOptions,
  PackagePolicyIneligibleForUpgradeError,
  PackagePolicyValidationError,
} from '../errors';
import { NewPackagePolicySchema, UpdatePackagePolicySchema } from '../types';
import type {
  NewPackagePolicy,
  UpdatePackagePolicy,
  PackagePolicy,
  PackagePolicySOAttributes,
  DryRunPackagePolicy,
} from '../types';
import type { ExternalCallback } from '..';

import { storedPackagePolicyToAgentInputs } from './agent_policies';
import { agentPolicyService } from './agent_policy';
import { getDataOutputForAgentPolicy } from './agent_policies';
import { outputService } from './output';
import { getPackageInfo, getInstallation, ensureInstalledPackage } from './epm/packages';
import { getAssetsData } from './epm/packages/assets';
import { compileTemplate } from './epm/agent/agent';
import { normalizeKuery } from './saved_object';
import { appContextService } from '.';
import { removeOldAssets } from './epm/packages/cleanup';
import type { PackageUpdateEvent, UpdateEventType } from './upgrade_sender';
import { sendTelemetryEvents } from './upgrade_sender';

export type InputsOverride = Partial<NewPackagePolicyInput> & {
  vars?: Array<NewPackagePolicyInput['vars'] & { name: string }>;
};

const SAVED_OBJECT_TYPE = PACKAGE_POLICY_SAVED_OBJECT_TYPE;

export const DATA_STREAM_ALLOWED_INDEX_PRIVILEGES = new Set([
  'auto_configure',
  'create_doc',
  'maintenance',
  'monitor',
  'read',
  'read_cross_cluster',
]);

class PackagePolicyService implements PackagePolicyServiceInterface {
  public async create(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicy: NewPackagePolicy,
    options?: {
      spaceId?: string;
      id?: string;
      user?: AuthenticatedUser;
      bumpRevision?: boolean;
      force?: boolean;
      skipEnsureInstalled?: boolean;
      skipUniqueNameVerification?: boolean;
      overwrite?: boolean;
    }
  ): Promise<PackagePolicy> {
    const agentPolicy = await agentPolicyService.get(soClient, packagePolicy.policy_id, true);

    if (agentPolicy && packagePolicy.package?.name === FLEET_APM_PACKAGE) {
      const dataOutput = await getDataOutputForAgentPolicy(soClient, agentPolicy);
      if (dataOutput.type === outputType.Logstash) {
        throw new IngestManagerError('You cannot add APM to a policy using a logstash output');
      }
    }

    // trailing whitespace causes issues creating API keys
    packagePolicy.name = packagePolicy.name.trim();
    if (!options?.skipUniqueNameVerification) {
      const existingPoliciesWithName = await this.list(soClient, {
        perPage: 1,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name: "${packagePolicy.name}"`,
      });

      // Check that the name does not exist already
      if (existingPoliciesWithName.items.length > 0) {
        throw new IngestManagerError(
          `An integration policy with the name ${packagePolicy.name} already exists. Please rename it or choose a different name.`
        );
      }
    }

    let elasticsearch: PackagePolicy['elasticsearch'];
    // Add ids to stream
    const packagePolicyId = options?.id || uuid.v4();
    let inputs: PackagePolicyInput[] = packagePolicy.inputs.map((input) =>
      assignStreamIdToInput(packagePolicyId, input)
    );

    // Make sure the associated package is installed
    if (packagePolicy.package?.name) {
      const pkgInfoPromise = getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: packagePolicy.package.name,
        pkgVersion: packagePolicy.package.version,
      });

      let pkgInfo: PackageInfo;

      if (options?.skipEnsureInstalled) pkgInfo = await pkgInfoPromise;
      else {
        const [, packageInfo] = await Promise.all([
          ensureInstalledPackage({
            esClient,
            spaceId: options?.spaceId || DEFAULT_SPACE_ID,
            savedObjectsClient: soClient,
            pkgName: packagePolicy.package.name,
            pkgVersion: packagePolicy.package.version,
          }),
          pkgInfoPromise,
        ]);
        pkgInfo = packageInfo;
      }

      // Check if it is a limited package, and if so, check that the corresponding agent policy does not
      // already contain a package policy for this package
      if (isPackageLimited(pkgInfo)) {
        if (agentPolicy && doesAgentPolicyAlreadyIncludePackage(agentPolicy, pkgInfo.name)) {
          throw new IngestManagerError(
            `Unable to create package policy. Package '${pkgInfo.name}' already exists on this agent policy.`
          );
        }
      }
      validatePackagePolicyOrThrow(packagePolicy, pkgInfo);

      inputs = await _compilePackagePolicyInputs(pkgInfo, packagePolicy.vars || {}, inputs);

      elasticsearch = pkgInfo.elasticsearch;
    }

    const isoDate = new Date().toISOString();
    const newSo = await soClient.create<PackagePolicySOAttributes>(
      SAVED_OBJECT_TYPE,
      {
        ...packagePolicy,
        inputs,
        elasticsearch,
        revision: 1,
        created_at: isoDate,
        created_by: options?.user?.username ?? 'system',
        updated_at: isoDate,
        updated_by: options?.user?.username ?? 'system',
      },

      { ...options, id: packagePolicyId }
    );

    // Assign it to the given agent policy
    await agentPolicyService.assignPackagePolicies(
      soClient,
      esClient,
      packagePolicy.policy_id,
      [newSo.id],
      {
        user: options?.user,
        bumpRevision: options?.bumpRevision ?? true,
        force: options?.force,
      }
    );

    return {
      id: newSo.id,
      version: newSo.version,
      ...newSo.attributes,
    };
  }

  public async bulkCreate(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicies: NewPackagePolicy[],
    agentPolicyId: string,
    options?: { user?: AuthenticatedUser; bumpRevision?: boolean }
  ): Promise<PackagePolicy[]> {
    const isoDate = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { saved_objects } = await soClient.bulkCreate<PackagePolicySOAttributes>(
      packagePolicies.map((packagePolicy) => {
        const packagePolicyId = uuid.v4();

        const inputs = packagePolicy.inputs.map((input) =>
          assignStreamIdToInput(packagePolicyId, input)
        );

        return {
          type: SAVED_OBJECT_TYPE,
          id: packagePolicyId,
          attributes: {
            ...packagePolicy,
            inputs,
            policy_id: agentPolicyId,
            revision: 1,
            created_at: isoDate,
            created_by: options?.user?.username ?? 'system',
            updated_at: isoDate,
            updated_by: options?.user?.username ?? 'system',
          },
        };
      })
    );

    // Filter out invalid SOs
    const newSos = saved_objects.filter((so) => !so.error && so.attributes);

    // Assign it to the given agent policy
    await agentPolicyService.assignPackagePolicies(
      soClient,
      esClient,
      agentPolicyId,
      newSos.map((newSo) => newSo.id),
      {
        user: options?.user,
        bumpRevision: options?.bumpRevision ?? true,
      }
    );

    return newSos.map((newSo) => ({
      id: newSo.id,
      version: newSo.version,
      ...newSo.attributes,
    }));
  }

  public async get(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<PackagePolicy | null> {
    const packagePolicySO = await soClient.get<PackagePolicySOAttributes>(SAVED_OBJECT_TYPE, id);
    if (!packagePolicySO) {
      return null;
    }

    if (packagePolicySO.error) {
      throw new Error(packagePolicySO.error.message);
    }

    return {
      id: packagePolicySO.id,
      version: packagePolicySO.version,
      ...packagePolicySO.attributes,
    };
  }

  public async getByIDs(
    soClient: SavedObjectsClientContract,
    ids: string[]
  ): Promise<PackagePolicy[] | null> {
    const packagePolicySO = await soClient.bulkGet<PackagePolicySOAttributes>(
      ids.map((id) => ({
        id,
        type: SAVED_OBJECT_TYPE,
      }))
    );
    if (!packagePolicySO) {
      return null;
    }

    return packagePolicySO.saved_objects.map((so) => ({
      id: so.id,
      version: so.version,
      ...so.attributes,
    }));
  }

  public async list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery
  ): Promise<ListResult<PackagePolicy>> {
    const { page = 1, perPage = 20, sortField = 'updated_at', sortOrder = 'desc', kuery } = options;

    const packagePolicies = await soClient.find<PackagePolicySOAttributes>({
      type: SAVED_OBJECT_TYPE,
      sortField,
      sortOrder,
      page,
      perPage,
      filter: kuery ? normalizeKuery(SAVED_OBJECT_TYPE, kuery) : undefined,
    });

    return {
      items: packagePolicies?.saved_objects.map((packagePolicySO) => ({
        id: packagePolicySO.id,
        version: packagePolicySO.version,
        ...packagePolicySO.attributes,
      })),
      total: packagePolicies?.total,
      page,
      perPage,
    };
  }

  public async listIds(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery
  ): Promise<ListResult<string>> {
    const { page = 1, perPage = 20, sortField = 'updated_at', sortOrder = 'desc', kuery } = options;

    const packagePolicies = await soClient.find<{}>({
      type: SAVED_OBJECT_TYPE,
      sortField,
      sortOrder,
      page,
      perPage,
      fields: [],
      filter: kuery ? normalizeKuery(SAVED_OBJECT_TYPE, kuery) : undefined,
    });

    return {
      items: packagePolicies.saved_objects.map((packagePolicySO) => packagePolicySO.id),
      total: packagePolicies.total,
      page,
      perPage,
    };
  }

  public async update(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    packagePolicyUpdate: UpdatePackagePolicy,
    options?: { user?: AuthenticatedUser; force?: boolean },
    currentVersion?: string
  ): Promise<PackagePolicy> {
    const packagePolicy = { ...packagePolicyUpdate, name: packagePolicyUpdate.name.trim() };
    const oldPackagePolicy = await this.get(soClient, id);
    const { version, ...restOfPackagePolicy } = packagePolicy;

    if (!oldPackagePolicy) {
      throw new Error('Package policy not found');
    }
    // Check that the name does not exist already but exclude the current package policy
    const existingPoliciesWithName = await this.list(soClient, {
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.name:"${packagePolicy.name}"`,
    });

    const filtered = (existingPoliciesWithName?.items || []).filter((p) => p.id !== id);

    if (filtered.length > 0) {
      throw new IngestManagerError(
        `An integration policy with the name ${packagePolicy.name} already exists. Please rename it or choose a different name.`
      );
    }

    let inputs = restOfPackagePolicy.inputs.map((input) =>
      assignStreamIdToInput(oldPackagePolicy.id, input)
    );

    inputs = enforceFrozenInputs(oldPackagePolicy.inputs, inputs, options?.force);
    let elasticsearch: PackagePolicy['elasticsearch'];
    if (packagePolicy.package?.name) {
      const pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: packagePolicy.package.name,
        pkgVersion: packagePolicy.package.version,
      });

      validatePackagePolicyOrThrow(packagePolicy, pkgInfo);

      inputs = await _compilePackagePolicyInputs(pkgInfo, packagePolicy.vars || {}, inputs);
      elasticsearch = pkgInfo.elasticsearch;
    }

    await soClient.update<PackagePolicySOAttributes>(
      SAVED_OBJECT_TYPE,
      id,
      {
        ...restOfPackagePolicy,
        inputs,
        elasticsearch,
        revision: oldPackagePolicy.revision + 1,
        updated_at: new Date().toISOString(),
        updated_by: options?.user?.username ?? 'system',
      },
      {
        version,
      }
    );

    // Bump revision of associated agent policy
    await agentPolicyService.bumpRevision(soClient, esClient, packagePolicy.policy_id, {
      user: options?.user,
    });

    const newPolicy = (await this.get(soClient, id)) as PackagePolicy;

    if (packagePolicy.package) {
      await removeOldAssets({
        soClient,
        pkgName: packagePolicy.package.name,
        currentVersion: packagePolicy.package.version,
      });

      if (packagePolicy.package.version !== currentVersion) {
        const upgradeTelemetry: PackageUpdateEvent = {
          packageName: packagePolicy.package.name,
          currentVersion: currentVersion || 'unknown',
          newVersion: packagePolicy.package.version,
          status: 'success',
          eventType: 'package-policy-upgrade' as UpdateEventType,
        };
        sendTelemetryEvents(
          appContextService.getLogger(),
          appContextService.getTelemetryEventsSender(),
          upgradeTelemetry
        );
        appContextService.getLogger().info(`Package policy upgraded successfully`);
        appContextService.getLogger().debug(JSON.stringify(upgradeTelemetry));
      }
    }

    return newPolicy;
  }

  public async delete(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    ids: string[],
    options?: { user?: AuthenticatedUser; skipUnassignFromAgentPolicies?: boolean; force?: boolean }
  ): Promise<DeletePackagePoliciesResponse> {
    const result: DeletePackagePoliciesResponse = [];

    for (const id of ids) {
      try {
        const packagePolicy = await this.get(soClient, id);
        if (!packagePolicy) {
          throw new Error('Package policy not found');
        }
        if (!options?.skipUnassignFromAgentPolicies) {
          await agentPolicyService.unassignPackagePolicies(
            soClient,
            esClient,
            packagePolicy.policy_id,
            [packagePolicy.id],
            {
              user: options?.user,
              force: options?.force,
            }
          );
        }
        await soClient.delete(SAVED_OBJECT_TYPE, id);
        result.push({
          id,
          name: packagePolicy.name,
          success: true,
          package: {
            name: packagePolicy.package?.name || '',
            title: packagePolicy.package?.title || '',
            version: packagePolicy.package?.version || '',
          },
          policy_id: packagePolicy.policy_id,
        });
      } catch (error) {
        result.push({
          id,
          success: false,
          ...ingestErrorToResponseOptions(error),
        });
      }
    }

    return result;
  }

  // TODO should move out, public only for unit tests
  public async getUpgradePackagePolicyInfo(
    soClient: SavedObjectsClientContract,
    id: string,
    packagePolicy?: PackagePolicy,
    pkgVersion?: string
  ): Promise<{ packagePolicy: PackagePolicy; packageInfo: PackageInfo }> {
    if (!packagePolicy) {
      packagePolicy = (await this.get(soClient, id)) ?? undefined;
    }
    if (!pkgVersion && packagePolicy) {
      const installedPackage = await getInstallation({
        savedObjectsClient: soClient,
        pkgName: packagePolicy.package!.name,
      });
      if (!installedPackage) {
        throw new IngestManagerError(
          i18n.translate('xpack.fleet.packagePolicy.packageNotInstalledError', {
            defaultMessage: 'Package {name} is not installed',
            values: {
              name: packagePolicy.package!.name,
            },
          })
        );
      }
      pkgVersion = installedPackage.version;
    }
    let packageInfo: PackageInfo | undefined;
    if (packagePolicy) {
      packageInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: packagePolicy!.package!.name,
        pkgVersion: pkgVersion ?? '',
      });
    }

    this.validateUpgradePackagePolicy(id, packageInfo, packagePolicy);

    return { packagePolicy: packagePolicy!, packageInfo: packageInfo! };
  }

  private validateUpgradePackagePolicy(
    id: string,
    packageInfo?: PackageInfo,
    packagePolicy?: PackagePolicy
  ) {
    if (!packagePolicy) {
      throw new IngestManagerError(
        i18n.translate('xpack.fleet.packagePolicy.policyNotFoundError', {
          defaultMessage: 'Package policy with id {id} not found',
          values: { id },
        })
      );
    }

    if (!packagePolicy.package?.name) {
      throw new IngestManagerError(
        i18n.translate('xpack.fleet.packagePolicy.packageNotFoundError', {
          defaultMessage: 'Package policy with id {id} has no named package',
          values: { id },
        })
      );
    }

    const isInstalledVersionLessThanPolicyVersion = semverLt(
      packageInfo?.version ?? '',
      packagePolicy.package.version
    );

    if (isInstalledVersionLessThanPolicyVersion) {
      throw new PackagePolicyIneligibleForUpgradeError(
        i18n.translate('xpack.fleet.packagePolicy.ineligibleForUpgradeError', {
          defaultMessage:
            "Package policy {id}'s package version {version} of package {name} is newer than the installed package version. Please install the latest version of {name}.",
          values: {
            id: packagePolicy.id,
            name: packagePolicy.package.name,
            version: packagePolicy.package.version,
          },
        })
      );
    }
  }

  public async upgrade(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    ids: string[],
    options?: { user?: AuthenticatedUser },
    packagePolicy?: PackagePolicy,
    pkgVersion?: string
  ): Promise<UpgradePackagePolicyResponse> {
    const result: UpgradePackagePolicyResponse = [];

    for (const id of ids) {
      try {
        let packageInfo: PackageInfo;
        ({ packagePolicy, packageInfo } = await this.getUpgradePackagePolicyInfo(
          soClient,
          id,
          packagePolicy,
          pkgVersion
        ));

        await this.doUpgrade(soClient, esClient, id, packagePolicy!, result, packageInfo, options);
      } catch (error) {
        result.push({
          id,
          success: false,
          ...ingestErrorToResponseOptions(error),
        });
      }
    }

    return result;
  }

  private async doUpgrade(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    packagePolicy: PackagePolicy,
    result: UpgradePackagePolicyResponse,
    packageInfo: PackageInfo,
    options?: { user?: AuthenticatedUser }
  ) {
    const updatePackagePolicy = updatePackageInputs(
      {
        ...omit(packagePolicy, 'id'),
        inputs: packagePolicy.inputs,
        package: {
          ...packagePolicy.package!,
          version: packageInfo.version,
        },
      },
      packageInfo,
      packageToPackagePolicyInputs(packageInfo) as InputsOverride[]
    );
    updatePackagePolicy.inputs = await _compilePackagePolicyInputs(
      packageInfo,
      updatePackagePolicy.vars || {},
      updatePackagePolicy.inputs as PackagePolicyInput[]
    );
    updatePackagePolicy.elasticsearch = packageInfo.elasticsearch;

    await this.update(
      soClient,
      esClient,
      id,
      updatePackagePolicy,
      options,
      packagePolicy.package!.version
    );
    result.push({
      id,
      name: packagePolicy.name,
      success: true,
    });
  }

  public async getUpgradeDryRunDiff(
    soClient: SavedObjectsClientContract,
    id: string,
    packagePolicy?: PackagePolicy,
    pkgVersion?: string
  ): Promise<UpgradePackagePolicyDryRunResponseItem> {
    try {
      let packageInfo: PackageInfo;
      ({ packagePolicy, packageInfo } = await this.getUpgradePackagePolicyInfo(
        soClient,
        id,
        packagePolicy,
        pkgVersion
      ));

      return this.calculateDiff(soClient, packagePolicy, packageInfo);
    } catch (error) {
      return {
        hasErrors: true,
        ...ingestErrorToResponseOptions(error),
      };
    }
  }

  private async calculateDiff(
    soClient: SavedObjectsClientContract,
    packagePolicy: PackagePolicy,
    packageInfo: PackageInfo
  ): Promise<UpgradePackagePolicyDryRunResponseItem> {
    const updatedPackagePolicy = updatePackageInputs(
      {
        ...omit(packagePolicy, 'id'),
        inputs: packagePolicy.inputs,
        package: {
          ...packagePolicy.package!,
          version: packageInfo.version,
        },
      },
      packageInfo,
      packageToPackagePolicyInputs(packageInfo) as InputsOverride[],
      true
    );
    updatedPackagePolicy.inputs = await _compilePackagePolicyInputs(
      packageInfo,
      updatedPackagePolicy.vars || {},
      updatedPackagePolicy.inputs as PackagePolicyInput[]
    );
    updatedPackagePolicy.elasticsearch = packageInfo.elasticsearch;

    const hasErrors = 'errors' in updatedPackagePolicy;

    this.sendUpgradeTelemetry(
      packagePolicy.package!,
      packageInfo.version,
      hasErrors,
      updatedPackagePolicy.errors
    );

    return {
      name: updatedPackagePolicy.name,
      diff: [packagePolicy, updatedPackagePolicy],
      // TODO: Currently only returns the agent inputs for current package policy, not the upgraded one
      // as we only show this version in the UI
      agent_diff: [storedPackagePolicyToAgentInputs(packagePolicy, packageInfo)],
      hasErrors,
    };
  }

  private sendUpgradeTelemetry(
    packagePolicyPackage: PackagePolicyPackage,
    latestVersion: string,
    hasErrors: boolean,
    errors?: Array<{ key: string | undefined; message: string }>
  ) {
    if (packagePolicyPackage.version !== latestVersion) {
      const upgradeTelemetry: PackageUpdateEvent = {
        packageName: packagePolicyPackage.name,
        currentVersion: packagePolicyPackage.version,
        newVersion: latestVersion,
        status: hasErrors ? 'failure' : 'success',
        error: hasErrors ? errors : undefined,
        dryRun: true,
        eventType: 'package-policy-upgrade' as UpdateEventType,
      };
      sendTelemetryEvents(
        appContextService.getLogger(),
        appContextService.getTelemetryEventsSender(),
        upgradeTelemetry
      );
      appContextService
        .getLogger()
        .info(
          `Package policy upgrade dry run ${hasErrors ? 'resulted in errors' : 'ran successfully'}`
        );
      appContextService.getLogger().debug(JSON.stringify(upgradeTelemetry));
    }
  }

  public async enrichPolicyWithDefaultsFromPackage(
    soClient: SavedObjectsClientContract,
    newPolicy: NewPackagePolicy
  ): Promise<NewPackagePolicy> {
    let newPackagePolicy: NewPackagePolicy = newPolicy;
    if (newPolicy.package) {
      const newPP = await this.buildPackagePolicyFromPackageWithVersion(
        soClient,
        newPolicy.package.name,
        newPolicy.package.version
      );
      if (newPP) {
        const inputs = newPolicy.inputs.map((input) => {
          const defaultInput = newPP.inputs.find(
            (i) =>
              i.type === input.type &&
              (!input.policy_template || input.policy_template === i.policy_template)
          );
          return {
            ...defaultInput,
            enabled: input.enabled,
            type: input.type,
            // to propagate "enabled: false" to streams
            streams: defaultInput?.streams?.map((stream) => ({
              ...stream,
              enabled: input.enabled,
            })),
          } as NewPackagePolicyInput;
        });
        let agentPolicyId;
        // fallback to first agent policy id in case no policy_id is specified, BWC with 8.0
        if (!newPolicy.policy_id) {
          const { items: agentPolicies } = await agentPolicyService.list(soClient, {
            perPage: 1,
          });
          if (agentPolicies.length > 0) {
            agentPolicyId = agentPolicies[0].id;
          }
        }
        newPackagePolicy = {
          ...newPP,
          name: newPolicy.name,
          namespace: newPolicy.namespace ?? 'default',
          description: newPolicy.description ?? '',
          enabled: newPolicy.enabled ?? true,
          policy_id: newPolicy.policy_id ?? agentPolicyId,
          output_id: newPolicy.output_id ?? '',
          inputs: newPolicy.inputs[0]?.streams ? newPolicy.inputs : inputs,
          vars: newPolicy.vars || newPP.vars,
        };
      }
    }
    return newPackagePolicy;
  }

  private async buildPackagePolicyFromPackageWithVersion(
    soClient: SavedObjectsClientContract,
    pkgName: string,
    pkgVersion: string
  ): Promise<NewPackagePolicy | undefined> {
    const packageInfo = await getPackageInfo({
      savedObjectsClient: soClient,
      pkgName,
      pkgVersion,
    });
    if (packageInfo) {
      return packageToPackagePolicy(packageInfo, '', '');
    }
  }

  public async buildPackagePolicyFromPackage(
    soClient: SavedObjectsClientContract,
    pkgName: string
  ): Promise<NewPackagePolicy | undefined> {
    const pkgInstall = await getInstallation({ savedObjectsClient: soClient, pkgName });
    if (pkgInstall) {
      const [packageInfo, defaultOutputId] = await Promise.all([
        getPackageInfo({
          savedObjectsClient: soClient,
          pkgName: pkgInstall.name,
          pkgVersion: pkgInstall.version,
        }),
        outputService.getDefaultDataOutputId(soClient),
      ]);
      if (packageInfo) {
        if (!defaultOutputId) {
          throw new Error('Default output is not set');
        }
        return packageToPackagePolicy(packageInfo, '', defaultOutputId);
      }
    }
  }

  public async runExternalCallbacks<A extends ExternalCallback[0]>(
    externalCallbackType: A,
    packagePolicy: A extends 'postPackagePolicyDelete'
      ? DeletePackagePoliciesResponse
      : A extends 'packagePolicyPostCreate'
      ? PackagePolicy
      : NewPackagePolicy,
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<
    A extends 'postPackagePolicyDelete'
      ? void
      : A extends 'packagePolicyPostCreate'
      ? PackagePolicy
      : NewPackagePolicy
  >;
  public async runExternalCallbacks(
    externalCallbackType: ExternalCallback[0],
    packagePolicy: PackagePolicy | NewPackagePolicy | DeletePackagePoliciesResponse,
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<PackagePolicy | NewPackagePolicy | void> {
    if (externalCallbackType === 'postPackagePolicyDelete') {
      return await this.runDeleteExternalCallbacks(packagePolicy as DeletePackagePoliciesResponse);
    } else {
      if (!Array.isArray(packagePolicy)) {
        let newData = packagePolicy;
        const externalCallbacks = appContextService.getExternalCallbacks(externalCallbackType);
        if (externalCallbacks && externalCallbacks.size > 0) {
          let updatedNewData = newData;
          for (const callback of externalCallbacks) {
            const result = await callback(updatedNewData, context, request);
            if (externalCallbackType === 'packagePolicyCreate') {
              updatedNewData = NewPackagePolicySchema.validate(result);
            } else if (externalCallbackType === 'packagePolicyUpdate') {
              updatedNewData = UpdatePackagePolicySchema.validate(result);
            }
          }

          newData = updatedNewData;
        }
        return newData;
      }
    }
  }

  public async runDeleteExternalCallbacks(
    deletedPackagePolicies: DeletePackagePoliciesResponse
  ): Promise<void> {
    const externalCallbacks = appContextService.getExternalCallbacks('postPackagePolicyDelete');
    const errorsThrown: Error[] = [];

    if (externalCallbacks && externalCallbacks.size > 0) {
      for (const callback of externalCallbacks) {
        // Failures from an external callback should not prevent other external callbacks from being
        // executed. Errors (if any) will be collected and `throw`n after processing the entire set
        try {
          await callback(deletedPackagePolicies);
        } catch (error) {
          errorsThrown.push(error);
        }
      }

      if (errorsThrown.length > 0) {
        throw new IngestManagerError(
          `${errorsThrown.length} encountered while executing package delete external callbacks`,
          errorsThrown
        );
      }
    }
  }
}

function validatePackagePolicyOrThrow(packagePolicy: NewPackagePolicy, pkgInfo: PackageInfo) {
  const validationResults = validatePackagePolicy(packagePolicy, pkgInfo, safeLoad);
  if (validationHasErrors(validationResults)) {
    const responseFormattedValidationErrors = Object.entries(getFlattenedObject(validationResults))
      .map(([key, value]) => ({
        key,
        message: value,
      }))
      .filter(({ message }) => !!message);

    if (responseFormattedValidationErrors.length) {
      throw new PackagePolicyValidationError(
        i18n.translate('xpack.fleet.packagePolicyInvalidError', {
          defaultMessage: 'Package policy is invalid: {errors}',
          values: {
            errors: responseFormattedValidationErrors
              .map(({ key, message }) => `${key}: ${message}`)
              .join('\n'),
          },
        })
      );
    }
  }
}

function assignStreamIdToInput(packagePolicyId: string, input: NewPackagePolicyInput) {
  return {
    ...input,
    streams: input.streams.map((stream) => {
      return { ...stream, id: `${input.type}-${stream.data_stream.dataset}-${packagePolicyId}` };
    }),
  };
}

export async function _compilePackagePolicyInputs(
  pkgInfo: PackageInfo,
  vars: PackagePolicy['vars'],
  inputs: PackagePolicyInput[]
): Promise<PackagePolicyInput[]> {
  const inputsPromises = inputs.map(async (input) => {
    const compiledInput = await _compilePackagePolicyInput(pkgInfo, vars, input);
    const compiledStreams = await _compilePackageStreams(pkgInfo, vars, input);
    return {
      ...input,
      compiled_input: compiledInput,
      streams: compiledStreams,
    };
  });

  return Promise.all(inputsPromises);
}

async function _compilePackagePolicyInput(
  pkgInfo: PackageInfo,
  vars: PackagePolicy['vars'],
  input: PackagePolicyInput
) {
  const packagePolicyTemplate = input.policy_template
    ? pkgInfo.policy_templates?.find(
        (policyTemplate) => policyTemplate.name === input.policy_template
      )
    : pkgInfo.policy_templates?.[0];

  if (!input.enabled || !packagePolicyTemplate || !packagePolicyTemplate.inputs?.length) {
    return undefined;
  }

  const packageInputs = packagePolicyTemplate.inputs;
  const packageInput = packageInputs.find((pkgInput) => pkgInput.type === input.type);
  if (!packageInput) {
    throw new Error(`Input template not found, unable to find input type ${input.type}`);
  }

  if (!packageInput.template_path) {
    return undefined;
  }

  const [pkgInputTemplate] = await getAssetsData(pkgInfo, (path: string) =>
    path.endsWith(`/agent/input/${packageInput.template_path!}`)
  );

  if (!pkgInputTemplate || !pkgInputTemplate.buffer) {
    throw new Error(`Unable to load input template at /agent/input/${packageInput.template_path!}`);
  }

  return compileTemplate(
    // Populate template variables from package- and input-level vars
    Object.assign({}, vars, input.vars),
    pkgInputTemplate.buffer.toString()
  );
}

async function _compilePackageStreams(
  pkgInfo: PackageInfo,
  vars: PackagePolicy['vars'],
  input: PackagePolicyInput
) {
  const streamsPromises = input.streams.map((stream) =>
    _compilePackageStream(pkgInfo, vars, input, stream)
  );

  return await Promise.all(streamsPromises);
}

// temporary export to enable testing pending refactor https://github.com/elastic/kibana/issues/112386
export function _applyIndexPrivileges(
  packageDataStream: RegistryDataStream,
  stream: PackagePolicyInputStream
): PackagePolicyInputStream {
  const streamOut = { ...stream };

  const indexPrivileges = packageDataStream?.elasticsearch?.privileges?.indices;

  if (!indexPrivileges?.length) {
    return streamOut;
  }

  const [valid, invalid] = partition(indexPrivileges, (permission) =>
    DATA_STREAM_ALLOWED_INDEX_PRIVILEGES.has(permission)
  );

  if (invalid.length) {
    appContextService
      .getLogger()
      .warn(
        `Ignoring invalid or forbidden index privilege(s) in "${stream.id}" data stream: ${invalid}`
      );
  }

  if (valid.length) {
    stream.data_stream.elasticsearch = {
      privileges: {
        indices: valid,
      },
    };
  }

  return streamOut;
}

async function _compilePackageStream(
  pkgInfo: PackageInfo,
  vars: PackagePolicy['vars'],
  input: PackagePolicyInput,
  streamIn: PackagePolicyInputStream
) {
  let stream = streamIn;

  if (!stream.enabled) {
    return { ...stream, compiled_stream: undefined };
  }

  const packageDataStreams = pkgInfo.data_streams;
  if (!packageDataStreams) {
    throw new Error('Stream template not found, no data streams');
  }

  const packageDataStream = packageDataStreams.find(
    (pkgDataStream) => pkgDataStream.dataset === stream.data_stream.dataset
  );

  if (!packageDataStream) {
    throw new Error(
      `Stream template not found, unable to find dataset ${stream.data_stream.dataset}`
    );
  }

  stream = _applyIndexPrivileges(packageDataStream, streamIn);

  const streamFromPkg = (packageDataStream.streams || []).find(
    (pkgStream) => pkgStream.input === input.type
  );
  if (!streamFromPkg) {
    throw new Error(`Stream template not found, unable to find stream for input ${input.type}`);
  }

  if (!streamFromPkg.template_path) {
    throw new Error(`Stream template path not found for dataset ${stream.data_stream.dataset}`);
  }

  const datasetPath = packageDataStream.path;

  const [pkgStreamTemplate] = await getAssetsData(
    pkgInfo,
    (path: string) => path.endsWith(streamFromPkg.template_path),
    datasetPath
  );

  if (!pkgStreamTemplate || !pkgStreamTemplate.buffer) {
    throw new Error(
      `Unable to load stream template ${streamFromPkg.template_path} for dataset ${stream.data_stream.dataset}`
    );
  }

  const yaml = compileTemplate(
    // Populate template variables from package-, input-, and stream-level vars
    Object.assign({}, vars, input.vars, stream.vars),
    pkgStreamTemplate.buffer.toString()
  );

  stream.compiled_stream = yaml;

  return { ...stream };
}

function enforceFrozenInputs(
  oldInputs: PackagePolicyInput[],
  newInputs: PackagePolicyInput[],
  force = false
) {
  const resultInputs = [...newInputs];

  for (const input of resultInputs) {
    const oldInput = oldInputs.find((i) => i.type === input.type);
    if (oldInput?.keep_enabled) input.enabled = oldInput.enabled;
    if (input.vars && oldInput?.vars) {
      input.vars = _enforceFrozenVars(oldInput.vars, input.vars, force);
    }
    if (input.streams && oldInput?.streams) {
      for (const stream of input.streams) {
        const oldStream = oldInput.streams.find((s) => s.id === stream.id);
        if (oldStream?.keep_enabled) stream.enabled = oldStream.enabled;
        if (stream.vars && oldStream?.vars) {
          stream.vars = _enforceFrozenVars(oldStream.vars, stream.vars, force);
        }
      }
    }
  }

  return resultInputs;
}

function _enforceFrozenVars(
  oldVars: Record<string, PackagePolicyConfigRecordEntry>,
  newVars: Record<string, PackagePolicyConfigRecordEntry>,
  force = false
) {
  const resultVars: Record<string, PackagePolicyConfigRecordEntry> = {};
  for (const [key, val] of Object.entries(newVars)) {
    if (oldVars[key]?.frozen) {
      if (force) {
        resultVars[key] = val;
      } else if (!isEqual(oldVars[key].value, val.value) || oldVars[key].type !== val.type) {
        throw new PackagePolicyValidationError(
          `${key} is a frozen variable and cannot be modified`
        );
      } else {
        resultVars[key] = oldVars[key];
      }
    } else {
      resultVars[key] = val;
    }
  }
  for (const [key, val] of Object.entries(oldVars)) {
    if (!newVars[key] && val.frozen) {
      resultVars[key] = val;
    }
  }
  return resultVars;
}

export interface PackagePolicyServiceInterface {
  create(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicy: NewPackagePolicy,
    options?: {
      spaceId?: string;
      id?: string;
      user?: AuthenticatedUser;
      bumpRevision?: boolean;
      force?: boolean;
      skipEnsureInstalled?: boolean;
      skipUniqueNameVerification?: boolean;
      overwrite?: boolean;
    }
  ): Promise<PackagePolicy>;

  bulkCreate(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicies: NewPackagePolicy[],
    agentPolicyId: string,
    options?: { user?: AuthenticatedUser; bumpRevision?: boolean }
  ): Promise<PackagePolicy[]>;

  get(soClient: SavedObjectsClientContract, id: string): Promise<PackagePolicy | null>;

  getByIDs(soClient: SavedObjectsClientContract, ids: string[]): Promise<PackagePolicy[] | null>;

  list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery
  ): Promise<ListResult<PackagePolicy>>;

  listIds(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery
  ): Promise<ListResult<string>>;

  update(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    packagePolicyUpdate: UpdatePackagePolicy,
    options?: { user?: AuthenticatedUser; force?: boolean },
    currentVersion?: string
  ): Promise<PackagePolicy>;

  delete(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    ids: string[],
    options?: { user?: AuthenticatedUser; skipUnassignFromAgentPolicies?: boolean; force?: boolean }
  ): Promise<DeletePackagePoliciesResponse>;

  upgrade(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    ids: string[],
    options?: { user?: AuthenticatedUser },
    packagePolicy?: PackagePolicy,
    pkgVersion?: string
  ): Promise<UpgradePackagePolicyResponse>;

  getUpgradeDryRunDiff(
    soClient: SavedObjectsClientContract,
    id: string,
    packagePolicy?: PackagePolicy,
    pkgVersion?: string
  ): Promise<UpgradePackagePolicyDryRunResponseItem>;

  enrichPolicyWithDefaultsFromPackage(
    soClient: SavedObjectsClientContract,
    newPolicy: NewPackagePolicy
  ): Promise<NewPackagePolicy>;

  buildPackagePolicyFromPackage(
    soClient: SavedObjectsClientContract,
    pkgName: string
  ): Promise<NewPackagePolicy | undefined>;

  runExternalCallbacks<A extends ExternalCallback[0]>(
    externalCallbackType: A,
    packagePolicy: A extends 'postPackagePolicyDelete'
      ? DeletePackagePoliciesResponse
      : A extends 'packagePolicyPostCreate'
      ? PackagePolicy
      : NewPackagePolicy,
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<
    A extends 'postPackagePolicyDelete'
      ? void
      : A extends 'packagePolicyPostCreate'
      ? PackagePolicy
      : NewPackagePolicy
  >;

  runDeleteExternalCallbacks(deletedPackagePolicies: DeletePackagePoliciesResponse): Promise<void>;

  getUpgradePackagePolicyInfo(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<{ packagePolicy: PackagePolicy; packageInfo: PackageInfo }>;
}
export const packagePolicyService: PackagePolicyServiceInterface = new PackagePolicyService();

export type { PackagePolicyService };

export function updatePackageInputs(
  basePackagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo,
  inputsUpdated?: InputsOverride[],
  dryRun?: boolean
): DryRunPackagePolicy {
  if (!inputsUpdated) return basePackagePolicy;

  const availablePolicyTemplates = packageInfo.policy_templates ?? [];

  const inputs = [
    ...basePackagePolicy.inputs.filter((input) => {
      if (!input.policy_template) {
        return true;
      }

      const policyTemplate = availablePolicyTemplates.find(
        ({ name }) => name === input.policy_template
      );

      // Ignore any policy templates removed in the new package version
      if (!policyTemplate) {
        return false;
      }

      // Ignore any inputs removed from this policy template in the new package version
      const policyTemplateStillIncludesInput =
        policyTemplate.inputs?.some(
          (policyTemplateInput) => policyTemplateInput.type === input.type
        ) ?? false;

      return policyTemplateStillIncludesInput;
    }),
  ];

  for (const update of inputsUpdated) {
    let originalInput: NewPackagePolicyInput | undefined;

    if (update.policy_template) {
      // If the updated value defines a policy template, try to find an original input
      // with the same policy template value
      const matchingInput = inputs.find(
        (i) => i.type === update.type && i.policy_template === update.policy_template
      );

      // If we didn't find an input with the same policy template, try to look for one
      // with the same type, but with an undefined policy template. This ensures we catch
      // cases where we're upgrading an older policy from before policy template was
      // reliably define on package policy inputs.
      originalInput =
        matchingInput || inputs.find((i) => i.type === update.type && !i.policy_template);
    } else {
      // For inputs that don't specify a policy template, just grab the first input
      // that matches its `type`
      originalInput = inputs.find((i) => i.type === update.type);
    }

    // If there's no corresponding input on the original package policy, just
    // take the override value from the new package as-is. This case typically
    // occurs when inputs or package policy templates are added/removed between versions.
    if (originalInput === undefined) {
      inputs.push(update as NewPackagePolicyInput);
      continue;
    }

    // For flags like this, we only want to override the original value if it was set
    // as `undefined` in the original object. An explicit true/false value should be
    // persisted from the original object to the result after the override process is complete.
    if (originalInput.enabled === undefined && update.enabled !== undefined) {
      originalInput.enabled = update.enabled;
    }

    if (originalInput.keep_enabled === undefined && update.keep_enabled !== undefined) {
      originalInput.keep_enabled = update.keep_enabled;
    }

    // `policy_template` should always be defined, so if we have an older policy here we need
    // to ensure we set it
    if (originalInput.policy_template === undefined && update.policy_template !== undefined) {
      originalInput.policy_template = update.policy_template;
    }

    if (update.vars) {
      const indexOfInput = inputs.indexOf(originalInput);
      inputs[indexOfInput] = deepMergeVars(originalInput, update, true) as NewPackagePolicyInput;
      originalInput = inputs[indexOfInput];
    }

    if (update.streams) {
      for (const stream of update.streams) {
        let originalStream = originalInput?.streams.find(
          (s) => s.data_stream.dataset === stream.data_stream.dataset
        );

        if (originalStream === undefined) {
          originalInput.streams.push(stream);
          continue;
        }

        if (originalStream?.enabled === undefined) {
          originalStream.enabled = stream.enabled;
        }

        if (stream.vars) {
          const indexOfStream = originalInput.streams.indexOf(originalStream);
          originalInput.streams[indexOfStream] = deepMergeVars(
            originalStream,
            stream as InputsOverride,
            true
          );
          originalStream = originalInput.streams[indexOfStream];
        }
      }
    }

    // Filter all stream that have been removed from the input
    originalInput.streams = originalInput.streams.filter((originalStream) => {
      return (
        update.streams?.some((s) => s.data_stream.dataset === originalStream.data_stream.dataset) ??
        false
      );
    });
  }

  const resultingPackagePolicy: NewPackagePolicy = {
    ...basePackagePolicy,
    inputs,
  };

  const validationResults = validatePackagePolicy(resultingPackagePolicy, packageInfo, safeLoad);

  if (validationHasErrors(validationResults)) {
    const responseFormattedValidationErrors = Object.entries(getFlattenedObject(validationResults))
      .map(([key, value]) => ({
        key,
        message: value,
      }))
      .filter(({ message }) => !!message);

    if (responseFormattedValidationErrors.length) {
      if (dryRun) {
        return { ...resultingPackagePolicy, errors: responseFormattedValidationErrors };
      }

      throw new PackagePolicyValidationError(
        i18n.translate('xpack.fleet.packagePolicyInvalidError', {
          defaultMessage: 'Package policy is invalid: {errors}',
          values: {
            errors: responseFormattedValidationErrors
              .map(({ key, message }) => `${key}: ${message}`)
              .join('\n'),
          },
        })
      );
    }
  }

  return resultingPackagePolicy;
}

export function preconfigurePackageInputs(
  basePackagePolicy: NewPackagePolicy,
  packageInfo: PackageInfo,
  preconfiguredInputs?: InputsOverride[]
): NewPackagePolicy {
  if (!preconfiguredInputs) return basePackagePolicy;

  const inputs = [...basePackagePolicy.inputs];

  for (const preconfiguredInput of preconfiguredInputs) {
    // Preconfiguration does not currently support multiple policy templates, so overrides will have an undefined
    // policy template, so we only match on `type` in that case.
    let originalInput = preconfiguredInput.policy_template
      ? inputs.find(
          (i) =>
            i.type === preconfiguredInput.type &&
            i.policy_template === preconfiguredInput.policy_template
        )
      : inputs.find((i) => i.type === preconfiguredInput.type);

    // If the input do not exist skip
    if (originalInput === undefined) {
      continue;
    }

    if (preconfiguredInput.enabled !== undefined) {
      originalInput.enabled = preconfiguredInput.enabled;
    }

    if (preconfiguredInput.keep_enabled !== undefined) {
      originalInput.keep_enabled = preconfiguredInput.keep_enabled;
    }

    if (preconfiguredInput.vars) {
      const indexOfInput = inputs.indexOf(originalInput);
      inputs[indexOfInput] = deepMergeVars(
        originalInput,
        preconfiguredInput
      ) as NewPackagePolicyInput;
      originalInput = inputs[indexOfInput];
    }

    if (preconfiguredInput.streams) {
      for (const stream of preconfiguredInput.streams) {
        let originalStream = originalInput?.streams.find(
          (s) => s.data_stream.dataset === stream.data_stream.dataset
        );

        if (originalStream === undefined) {
          continue;
        }

        if (stream.enabled !== undefined) {
          originalStream.enabled = stream.enabled;
        }

        if (stream.vars) {
          const indexOfStream = originalInput.streams.indexOf(originalStream);
          originalInput.streams[indexOfStream] = deepMergeVars(
            originalStream,
            stream as InputsOverride
          );
          originalStream = originalInput.streams[indexOfStream];
        }
      }
    }
  }

  const resultingPackagePolicy: NewPackagePolicy = {
    ...basePackagePolicy,
    inputs,
  };

  validatePackagePolicyOrThrow(resultingPackagePolicy, packageInfo);

  return resultingPackagePolicy;
}

function deepMergeVars(original: any, override: any, keepOriginalValue = false): any {
  if (!original.vars) {
    original.vars = { ...override.vars };
  }

  const result = { ...original };

  const overrideVars = Array.isArray(override.vars)
    ? override.vars
    : Object.entries(override.vars!).map(([key, rest]) => ({
        name: key,
        ...(rest as any),
      }));

  for (const { name, ...overrideVal } of overrideVars) {
    const originalVar = original.vars[name];

    result.vars[name] = { ...originalVar, ...overrideVal };

    // Ensure that any value from the original object is persisted on the newly merged resulting object,
    // even if we merge other data about the given variable
    if (keepOriginalValue && originalVar?.value !== undefined) {
      result.vars[name].value = originalVar.value;
    }
  }

  return result;
}
