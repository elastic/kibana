/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

import { omit, partition, isEqual, cloneDeep, without } from 'lodash';
import { i18n } from '@kbn/i18n';
import semverLt from 'semver/functions/lt';
import { getFlattenedObject } from '@kbn/std';
import type {
  AuthenticatedUser,
  KibanaRequest,
  ElasticsearchClient,
  SavedObjectsClientContract,
  Logger,
  RequestHandlerContext,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkUpdateObject,
} from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import { safeLoad } from 'js-yaml';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import pMap from 'p-map';

import type { SavedObjectError } from '@kbn/core-saved-objects-common';

import { HTTPAuthorizationHeader } from '../../common/http_authorization_header';

import {
  packageToPackagePolicy,
  packageToPackagePolicyInputs,
  isPackageLimited,
  doesAgentPolicyAlreadyIncludePackage,
  validatePackagePolicy,
  validationHasErrors,
  isInputOnlyPolicyTemplate,
  getNormalizedDataStreams,
  getNormalizedInputs,
  isRootPrivilegesRequired,
} from '../../common/services';
import {
  SO_SEARCH_LIMIT,
  PACKAGES_SAVED_OBJECT_TYPE,
  DATASET_VAR_NAME,
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type {
  PostDeletePackagePoliciesResponse,
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
  Installation,
  ExperimentalDataStreamFeature,
  DeletePackagePoliciesResponse,
  PolicySecretReference,
  AssetsMap,
  AgentPolicy,
} from '../../common/types';
import {
  FleetError,
  fleetErrorToResponseOptions,
  PackagePolicyIneligibleForUpgradeError,
  PackagePolicyValidationError,
  PackagePolicyRestrictionRelatedError,
  PackagePolicyNotFoundError,
  HostedAgentPolicyRestrictionRelatedError,
  FleetUnauthorizedError,
  PackagePolicyNameExistsError,
  AgentPolicyNotFoundError,
  InputNotFoundError,
  StreamNotFoundError,
} from '../errors';
import { NewPackagePolicySchema, PackagePolicySchema, UpdatePackagePolicySchema } from '../types';
import type {
  NewPackagePolicy,
  UpdatePackagePolicy,
  PackagePolicy,
  PackagePolicySOAttributes,
  DryRunPackagePolicy,
  PostPackagePolicyCreateCallback,
  PostPackagePolicyPostCreateCallback,
} from '../types';
import type { ExternalCallback } from '..';

import { createSoFindIterable } from './utils/create_so_find_iterable';

import type { FleetAuthzRouteConfig } from './security';

import { getAuthzFromRequest, doesNotHaveRequiredFleetAuthz } from './security';

import { storedPackagePolicyToAgentInputs } from './agent_policies';
import { agentPolicyService } from './agent_policy';
import { getPackageInfo, getInstallation, ensureInstalledPackage } from './epm/packages';
import { getAssetsDataFromAssetsMap } from './epm/packages/assets';
import { compileTemplate } from './epm/agent/agent';
import { escapeSearchQueryPhrase, normalizeKuery as _normalizeKuery } from './saved_object';
import { appContextService } from '.';
import { removeOldAssets } from './epm/packages/cleanup';
import type { PackageUpdateEvent, UpdateEventType } from './upgrade_sender';
import { sendTelemetryEvents } from './upgrade_sender';
import {
  handleExperimentalDatastreamFeatureOptIn,
  mapPackagePolicySavedObjectToPackagePolicy,
  preflightCheckPackagePolicy,
} from './package_policies';
import type {
  PackagePolicyClient,
  PackagePolicyClientFetchAllItemsOptions,
  PackagePolicyService,
} from './package_policy_service';
import { installAssetsForInputPackagePolicy } from './epm/packages/install';
import { auditLoggingService } from './audit_logging';
import {
  extractAndUpdateSecrets,
  extractAndWriteSecrets,
  deleteSecretsIfNotReferenced as deleteSecrets,
  isSecretStorageEnabled,
} from './secrets';
import { getPackageAssetsMap } from './epm/packages/get';
import { validateAgentPolicyOutputForIntegration } from './agent_policies/outputs_helpers';
import type { PackagePolicyClientFetchAllItemIdsOptions } from './package_policy_service';
import { validatePolicyNamespaceForSpace } from './spaces/policy_namespaces';
import { isSpaceAwarenessEnabled, isSpaceAwarenessMigrationPending } from './spaces/helpers';

export type InputsOverride = Partial<NewPackagePolicyInput> & {
  vars?: Array<NewPackagePolicyInput['vars'] & { name: string }>;
};

async function getPkgInfoAssetsMap({
  savedObjectsClient,
  packageInfos,
  logger,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  packageInfos: PackageInfo[];
  logger: Logger;
}) {
  const packageInfosandAssetsMap = new Map<
    string,
    { assetsMap: AssetsMap; pkgInfo: PackageInfo }
  >();
  await pMap(
    packageInfos,
    async (pkgInfo) => {
      const assetsMap = await getPackageAssetsMap({
        logger,
        packageInfo: pkgInfo,
        savedObjectsClient,
      });
      packageInfosandAssetsMap.set(`${pkgInfo.name}-${pkgInfo.version}`, {
        assetsMap,
        pkgInfo,
      });
    },
    { concurrency: 5 }
  );

  return packageInfosandAssetsMap;
}

export async function getPackagePolicySavedObjectType() {
  return (await isSpaceAwarenessEnabled())
    ? PACKAGE_POLICY_SAVED_OBJECT_TYPE
    : LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE;
}

function normalizeKuery(savedObjectType: string, kuery: string) {
  if (savedObjectType === LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE) {
    return _normalizeKuery(
      savedObjectType,
      kuery.replace(
        new RegExp(`${PACKAGE_POLICY_SAVED_OBJECT_TYPE}\\.`, 'g'),
        `${savedObjectType}.attributes.`
      )
    );
  } else {
    return _normalizeKuery(
      savedObjectType,
      kuery.replace(
        new RegExp(`${LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE}\\.`, 'g'),
        `${savedObjectType}.attributes.`
      )
    );
  }
}

class PackagePolicyClientImpl implements PackagePolicyClient {
  public async create(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicy: NewPackagePolicy,
    options: {
      authorizationHeader?: HTTPAuthorizationHeader | null;
      spaceId?: string;
      id?: string;
      user?: AuthenticatedUser;
      bumpRevision?: boolean;
      force?: boolean;
      skipEnsureInstalled?: boolean;
      skipUniqueNameVerification?: boolean;
      overwrite?: boolean;
      packageInfo?: PackageInfo;
    } = {},
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ): Promise<PackagePolicy> {
    const packagePolicyId = options?.id || uuidv4();

    let authorizationHeader = options.authorizationHeader;

    if (!authorizationHeader && request) {
      authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
    }

    const savedObjectType = await getPackagePolicySavedObjectType();

    auditLoggingService.writeCustomSoAuditLog({
      action: 'create',
      id: packagePolicyId,
      savedObjectType,
    });

    const logger = appContextService.getLogger();
    let secretReferences: PolicySecretReference[] | undefined;
    logger.debug(`Creating new package policy`);

    this.keepPolicyIdInSync(packagePolicy);
    await preflightCheckPackagePolicy(soClient, packagePolicy);

    let enrichedPackagePolicy = await packagePolicyService.runExternalCallbacks(
      'packagePolicyCreate',
      packagePolicy,
      soClient,
      esClient,
      context,
      request
    );

    const agentPolicies = [];

    for (const policyId of enrichedPackagePolicy.policy_ids) {
      const agentPolicy = await agentPolicyService.get(soClient, policyId, true);
      agentPolicies.push(agentPolicy);

      // If package policy did not set an output_id, see if the agent policy's output is compatible
      if (!packagePolicy.output_id && agentPolicy && enrichedPackagePolicy.package?.name) {
        await validateAgentPolicyOutputForIntegration(
          soClient,
          agentPolicy,
          enrichedPackagePolicy.package?.name
        );
      }

      await validateIsNotHostedPolicy(soClient, policyId, options?.force);
    }

    // trailing whitespace causes issues creating API keys
    enrichedPackagePolicy.name = enrichedPackagePolicy.name.trim();
    if (!options?.skipUniqueNameVerification) {
      await requireUniqueName(soClient, enrichedPackagePolicy);
    }
    if (enrichedPackagePolicy.namespace) {
      await validatePolicyNamespaceForSpace({
        namespace: enrichedPackagePolicy.namespace,
        spaceId: soClient.getCurrentNamespace(),
      });
    }

    let elasticsearchPrivileges: NonNullable<PackagePolicy['elasticsearch']>['privileges'];
    let inputs = getInputsWithStreamIds(enrichedPackagePolicy, packagePolicyId);

    // Make sure the associated package is installed
    if (enrichedPackagePolicy.package?.name) {
      if (!options?.skipEnsureInstalled) {
        await ensureInstalledPackage({
          esClient,
          spaceId: options?.spaceId || DEFAULT_SPACE_ID,
          savedObjectsClient: soClient,
          pkgName: enrichedPackagePolicy.package.name,
          pkgVersion: enrichedPackagePolicy.package.version,
          force: options?.force,
          authorizationHeader,
        });
      }

      // Handle component template/mappings updates for experimental features, e.g. synthetic source
      await handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: enrichedPackagePolicy,
      });

      const pkgInfo =
        options?.packageInfo ??
        (await getPackageInfo({
          savedObjectsClient: soClient,
          pkgName: enrichedPackagePolicy.package.name,
          pkgVersion: enrichedPackagePolicy.package.version,
          prerelease: true,
        }));

      // Check if it is a limited package, and if so, check that the corresponding agent policy does not
      // already contain a package policy for this package
      if (isPackageLimited(pkgInfo)) {
        for (const agentPolicy of agentPolicies) {
          if (agentPolicy && doesAgentPolicyAlreadyIncludePackage(agentPolicy, pkgInfo.name)) {
            throw new FleetError(
              `Unable to create integration policy. Integration '${pkgInfo.name}' already exists on this agent policy.`
            );
          }
        }
      }
      validatePackagePolicyOrThrow(enrichedPackagePolicy, pkgInfo);

      if (await isSecretStorageEnabled(esClient, soClient)) {
        const secretsRes = await extractAndWriteSecrets({
          packagePolicy: { ...enrichedPackagePolicy, inputs },
          packageInfo: pkgInfo,
          esClient,
        });

        enrichedPackagePolicy = secretsRes.packagePolicy;
        secretReferences = secretsRes.secretReferences;

        inputs = enrichedPackagePolicy.inputs as PackagePolicyInput[];
      }
      const assetsMap = await getPackageAssetsMap({
        logger,
        packageInfo: pkgInfo,
        savedObjectsClient: soClient,
      });
      inputs = await _compilePackagePolicyInputs(
        pkgInfo,
        enrichedPackagePolicy.vars || {},
        inputs,
        assetsMap
      );

      elasticsearchPrivileges = pkgInfo.elasticsearch?.privileges;

      if (pkgInfo.type === 'input') {
        await installAssetsForInputPackagePolicy({
          soClient,
          esClient,
          pkgInfo,
          packagePolicy: enrichedPackagePolicy,
          force: !!options?.force,
          logger,
        });
      }

      const requiresRoot = isRootPrivilegesRequired(pkgInfo);
      if (enrichedPackagePolicy.package && requiresRoot) {
        enrichedPackagePolicy.package = {
          ...enrichedPackagePolicy.package,
          requires_root: requiresRoot,
        };
      }
    }

    const isoDate = new Date().toISOString();
    const newSo = await soClient.create<PackagePolicySOAttributes>(
      savedObjectType,
      {
        ...enrichedPackagePolicy,
        ...(enrichedPackagePolicy.package
          ? { package: omit(enrichedPackagePolicy.package, 'experimental_data_stream_features') }
          : {}),
        inputs,
        ...(elasticsearchPrivileges && { elasticsearch: { privileges: elasticsearchPrivileges } }),
        ...(secretReferences?.length && { secret_references: secretReferences }),
        revision: 1,
        created_at: isoDate,
        created_by: options?.user?.username ?? 'system',
        updated_at: isoDate,
        updated_by: options?.user?.username ?? 'system',
      },

      { ...options, id: packagePolicyId }
    );

    if (options?.bumpRevision ?? true) {
      for (const policyId of enrichedPackagePolicy.policy_ids) {
        await agentPolicyService.bumpRevision(soClient, esClient, policyId, {
          user: options?.user,
        });
      }
    }

    const createdPackagePolicy = { id: newSo.id, version: newSo.version, ...newSo.attributes };
    logger.debug(`Created new package policy with id ${newSo.id} and version ${newSo.version}`);

    return packagePolicyService.runExternalCallbacks(
      'packagePolicyPostCreate',
      createdPackagePolicy,
      soClient,
      esClient
    );
  }

  keepPolicyIdInSync(packagePolicy: NewPackagePolicy): void {
    if (packagePolicy.policy_ids) {
      if (packagePolicy.policy_ids.length === 0 && packagePolicy.policy_id !== undefined) {
        packagePolicy.policy_id = null;
      }
    } else {
      packagePolicy.policy_ids = [];
    }
    if (packagePolicy.policy_id && !packagePolicy.policy_ids?.[0]) {
      packagePolicy.policy_ids = [packagePolicy.policy_id];
    } else if (!packagePolicy.policy_id && packagePolicy.policy_ids[0]) {
      packagePolicy.policy_id = packagePolicy.policy_ids[0];
    }
  }

  public async bulkCreate(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicies: NewPackagePolicyWithId[],
    options?: {
      user?: AuthenticatedUser;
      bumpRevision?: boolean;
      force?: true;
    }
  ): Promise<{
    created: PackagePolicy[];
    failed: Array<{ packagePolicy: NewPackagePolicy; error?: Error | SavedObjectError }>;
  }> {
    const savedObjectType = await getPackagePolicySavedObjectType();
    for (const packagePolicy of packagePolicies) {
      if (!packagePolicy.id) {
        packagePolicy.id = SavedObjectsUtils.generateId();
      }
      auditLoggingService.writeCustomSoAuditLog({
        action: 'create',
        id: packagePolicy.id,
        savedObjectType,
      });

      this.keepPolicyIdInSync(packagePolicy);
      await preflightCheckPackagePolicy(soClient, packagePolicy);
    }

    const agentPolicyIds = new Set(packagePolicies.flatMap((pkgPolicy) => pkgPolicy.policy_ids));

    for (const agentPolicyId of agentPolicyIds) {
      await validateIsNotHostedPolicy(soClient, agentPolicyId, options?.force);
    }

    const packageInfos = await getPackageInfoForPackagePolicies(packagePolicies, soClient);

    const isoDate = new Date().toISOString();

    const policiesToCreate: Array<SavedObjectsBulkCreateObject<PackagePolicySOAttributes>> = [];
    const failedPolicies: Array<{
      packagePolicy: NewPackagePolicyWithId;
      error: Error | SavedObjectError;
    }> = [];

    const logger = appContextService.getLogger();
    logger.debug(`Starting bulk create of package policy`);

    const packagePoliciesWithIds = packagePolicies.map((p) => {
      if (!p.id) {
        p.id = SavedObjectsUtils.generateId();
      }
      return p;
    });

    const packageInfosandAssetsMap = await getPkgInfoAssetsMap({
      logger,
      packageInfos: [...packageInfos.values()],
      savedObjectsClient: soClient,
    });

    await pMap(packagePoliciesWithIds, async (packagePolicy) => {
      try {
        const packagePolicyId = packagePolicy.id ?? uuidv4();
        const agentPolicyIdsOfPackagePolicy = packagePolicy.policy_ids;

        let inputs = getInputsWithStreamIds(packagePolicy, packagePolicyId);

        const { id, ...pkgPolicyWithoutId } = packagePolicy;

        let elasticsearch: PackagePolicy['elasticsearch'];
        if (packagePolicy.package) {
          const packageInfoAndAsset = packageInfosandAssetsMap.get(
            `${packagePolicy.package.name}-${packagePolicy.package.version}`
          );
          if (!packageInfoAndAsset) {
            throw new FleetError(
              `Package info and assets not found: ${packagePolicy.package.name}-${packagePolicy.package.version}`
            );
          }

          const { pkgInfo, assetsMap } = packageInfoAndAsset;
          validatePackagePolicyOrThrow(packagePolicy, pkgInfo);

          inputs = pkgInfo
            ? await _compilePackagePolicyInputs(
                pkgInfo,
                packagePolicy.vars || {},
                inputs,
                assetsMap
              )
            : inputs;

          elasticsearch = pkgInfo?.elasticsearch;

          const requiresRoot = isRootPrivilegesRequired(pkgInfo);
          if (packagePolicy.package && requiresRoot) {
            packagePolicy.package = {
              ...packagePolicy.package,
              requires_root: requiresRoot,
            };
          }
        }

        policiesToCreate.push({
          type: savedObjectType,
          id: packagePolicyId,
          attributes: {
            ...pkgPolicyWithoutId,
            ...(packagePolicy.package
              ? { package: omit(packagePolicy.package, 'experimental_data_stream_features') }
              : {}),
            inputs,
            elasticsearch,
            policy_id: agentPolicyIdsOfPackagePolicy[0],
            policy_ids: agentPolicyIdsOfPackagePolicy,
            revision: 1,
            created_at: isoDate,
            created_by: options?.user?.username ?? 'system',
            updated_at: isoDate,
            updated_by: options?.user?.username ?? 'system',
          },
        });
      } catch (error) {
        failedPolicies.push({ packagePolicy, error });
        logger.error(error);
      }
    });

    const { saved_objects: createdObjects } = await soClient.bulkCreate<PackagePolicySOAttributes>(
      policiesToCreate
    );

    // Filter out invalid SOs
    const newSos = createdObjects.filter((so) => !so.error && so.attributes);

    packagePoliciesWithIds.forEach((packagePolicy) => {
      const hasCreatedSO = newSos.find((so) => so.id === packagePolicy.id);
      const hasFailed = failedPolicies.some(
        ({ packagePolicy: failedPackagePolicy }) => failedPackagePolicy.id === packagePolicy.id
      );
      if (hasCreatedSO?.error && !hasFailed) {
        failedPolicies.push({
          packagePolicy,
          error: hasCreatedSO?.error ?? new FleetError('Failed to create package policy.'),
        });
      }
    });

    // Assign it to the given agent policy

    if (options?.bumpRevision ?? true) {
      for (const agentPolicyId of agentPolicyIds) {
        await agentPolicyService.bumpRevision(soClient, esClient, agentPolicyId, {
          user: options?.user,
        });
      }
    }
    logger.debug(`Created new package policies`);
    return {
      created: newSos.map((newSo) => ({
        id: newSo.id,
        version: newSo.version,
        ...newSo.attributes,
      })),
      failed: failedPolicies,
    };
  }

  /** Purpose of this function is to take a package policy and compile the inputs
   This is primarily used by the Synthetics UI to display the inputs which are passed to agent
   Purpose is to debug the inputs which are passed to the agent and also compared them to the config
   which is passed to public service locations */
  public async inspect(
    soClient: SavedObjectsClientContract,
    packagePolicy: NewPackagePolicyWithId
  ): Promise<NewPackagePolicy> {
    if (!packagePolicy.id) {
      packagePolicy.id = SavedObjectsUtils.generateId();
    }

    const packageInfos = await getPackageInfoForPackagePolicies([packagePolicy], soClient);

    let inputs = getInputsWithStreamIds(packagePolicy, packagePolicy.id);
    const { id, ...pkgPolicyWithoutId } = packagePolicy;

    let elasticsearch: PackagePolicy['elasticsearch'];
    if (packagePolicy.package) {
      const pkgInfo = packageInfos.get(
        `${packagePolicy.package.name}-${packagePolicy.package.version}`
      );
      if (!pkgInfo) {
        throw new FleetError(
          `Package info and assets not found: ${packagePolicy.package.name}-${packagePolicy.package.version}`
        );
      }
      const assetsMap = await getPackageAssetsMap({
        logger: appContextService.getLogger(),
        packageInfo: pkgInfo,
        savedObjectsClient: soClient,
      });
      inputs = pkgInfo
        ? await _compilePackagePolicyInputs(pkgInfo, packagePolicy.vars || {}, inputs, assetsMap)
        : inputs;

      elasticsearch = pkgInfo?.elasticsearch;
    }

    return {
      id: packagePolicy.id,
      ...pkgPolicyWithoutId,
      ...(packagePolicy.package
        ? { package: omit(packagePolicy.package, 'experimental_data_stream_features') }
        : {}),
      inputs,
      elasticsearch,
    };
  }

  public async get(
    soClient: SavedObjectsClientContract,
    id: string
  ): Promise<PackagePolicy | null> {
    const savedObjectType = await getPackagePolicySavedObjectType();
    const packagePolicySO = await soClient.get<PackagePolicySOAttributes>(savedObjectType, id);
    if (!packagePolicySO) {
      return null;
    }

    if (packagePolicySO.error) {
      throw new FleetError(packagePolicySO.error.message);
    }

    let experimentalFeatures: ExperimentalDataStreamFeature[] | undefined;

    if (packagePolicySO.attributes.package?.name) {
      const installation = await soClient.get<Installation>(
        PACKAGES_SAVED_OBJECT_TYPE,
        packagePolicySO.attributes.package?.name
      );

      if (installation && !installation.error) {
        experimentalFeatures = installation.attributes?.experimental_data_stream_features;
      }
    }

    const response = {
      id: packagePolicySO.id,
      version: packagePolicySO.version,
      ...packagePolicySO.attributes,
    };

    // If possible, return the experimental features map for the package policy's `package` field
    if (experimentalFeatures && response.package) {
      response.package.experimental_data_stream_features = experimentalFeatures;
    }

    auditLoggingService.writeCustomSoAuditLog({
      action: 'get',
      id,
      savedObjectType,
    });

    return response;
  }

  public async findAllForAgentPolicy(
    soClient: SavedObjectsClientContract,
    agentPolicyId: string
  ): Promise<PackagePolicy[]> {
    const savedObjectType = await getPackagePolicySavedObjectType();
    const packagePolicySO = await soClient.find<PackagePolicySOAttributes>({
      type: savedObjectType,
      filter: `${savedObjectType}.attributes.policy_ids:${escapeSearchQueryPhrase(agentPolicyId)}`,
      perPage: SO_SEARCH_LIMIT,
    });
    if (!packagePolicySO) {
      return [];
    }

    const packagePolicies = packagePolicySO.saved_objects.map((so) => ({
      id: so.id,
      version: so.version,
      ...so.attributes,
    }));

    for (const packagePolicy of packagePolicies) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'find',
        id: packagePolicy.id,
        savedObjectType,
      });
    }

    return packagePolicies;
  }

  public async getByIDs(
    soClient: SavedObjectsClientContract,
    ids: string[],
    options: { ignoreMissing?: boolean } = {}
  ): Promise<PackagePolicy[] | null> {
    const savedObjectType = await getPackagePolicySavedObjectType();
    const packagePolicySO = await soClient.bulkGet<PackagePolicySOAttributes>(
      ids.map((id) => ({
        id,
        type: savedObjectType,
      }))
    );
    if (!packagePolicySO) {
      return null;
    }

    const packagePolicies = packagePolicySO.saved_objects
      .map((so): PackagePolicy | null => {
        if (so.error) {
          if (options.ignoreMissing && so.error.statusCode === 404) {
            return null;
          } else if (so.error.statusCode === 404) {
            throw new PackagePolicyNotFoundError(`Package policy ${so.id} not found`);
          } else {
            throw new FleetError(so.error.message);
          }
        }

        return {
          id: so.id,
          version: so.version,
          ...so.attributes,
        };
      })
      .filter((packagePolicy): packagePolicy is PackagePolicy => packagePolicy !== null);

    for (const packagePolicy of packagePolicies) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'get',
        id: packagePolicy.id,
        savedObjectType,
      });
    }

    return packagePolicies;
  }

  public async list(
    soClient: SavedObjectsClientContract,
    options: ListWithKuery & { spaceId?: string }
  ): Promise<ListResult<PackagePolicy>> {
    const savedObjectType = await getPackagePolicySavedObjectType();

    const {
      page = 1,
      perPage = 20,
      sortField = 'updated_at',
      sortOrder = 'desc',
      kuery,
      fields,
    } = options;

    const packagePolicies = await soClient.find<PackagePolicySOAttributes>({
      type: savedObjectType,
      sortField,
      sortOrder,
      page,
      perPage,
      fields,
      filter: kuery ? normalizeKuery(savedObjectType, kuery) : undefined,
      namespaces: options.spaceId ? [options.spaceId] : undefined,
    });

    for (const packagePolicy of packagePolicies?.saved_objects ?? []) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'find',
        id: packagePolicy.id,
        savedObjectType,
      });
    }

    return {
      items: packagePolicies?.saved_objects.map((packagePolicySO) => ({
        id: packagePolicySO.id,
        version: packagePolicySO.version,
        ...packagePolicySO.attributes,
        spaceIds: packagePolicySO.namespaces,
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
    const savedObjectType = await getPackagePolicySavedObjectType();
    const packagePolicies = await soClient.find<{}>({
      type: savedObjectType,
      sortField,
      sortOrder,
      page,
      perPage,
      fields: [],
      filter: kuery ? normalizeKuery(savedObjectType, kuery) : undefined,
    });

    for (const packagePolicy of packagePolicies.saved_objects) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'find',
        id: packagePolicy.id,
        savedObjectType,
      });
    }

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
    options?: { user?: AuthenticatedUser; force?: boolean; skipUniqueNameVerification?: boolean }
  ): Promise<PackagePolicy> {
    const savedObjectType = await getPackagePolicySavedObjectType();
    auditLoggingService.writeCustomSoAuditLog({
      action: 'update',
      id,
      savedObjectType,
    });
    const logger = appContextService.getLogger();

    this.keepPolicyIdInSync(packagePolicyUpdate);

    let enrichedPackagePolicy: UpdatePackagePolicy;
    let secretReferences: PolicySecretReference[] | undefined;
    let secretsToDelete: PolicySecretReference[] | undefined;

    try {
      logger.debug(`Starting update of package policy ${id}`);
      await preflightCheckPackagePolicy(soClient, packagePolicyUpdate);
      enrichedPackagePolicy = await packagePolicyService.runExternalCallbacks(
        'packagePolicyUpdate',
        packagePolicyUpdate,
        soClient,
        esClient
      );
    } catch (error) {
      logger.error(`An error occurred executing "packagePolicyUpdate" callback: ${error}`);
      logger.error(error);
      if (error.apiPassThrough) {
        throw error;
      }
      enrichedPackagePolicy = packagePolicyUpdate;
    }

    const packagePolicy = { ...enrichedPackagePolicy, name: enrichedPackagePolicy.name.trim() };
    const oldPackagePolicy = await this.get(soClient, id);

    if (packagePolicyUpdate.is_managed && !options?.force) {
      throw new PackagePolicyRestrictionRelatedError(`Cannot update package policy ${id}`);
    }
    if (!oldPackagePolicy) {
      throw new PackagePolicyNotFoundError('Package policy not found');
    } else {
      this.keepPolicyIdInSync(oldPackagePolicy);
    }

    if (
      packagePolicy.name &&
      packagePolicy.name !== oldPackagePolicy.name &&
      !options?.skipUniqueNameVerification
    ) {
      await requireUniqueName(soClient, enrichedPackagePolicy, id);
    }

    if (packagePolicy.namespace) {
      await validatePolicyNamespaceForSpace({
        namespace: packagePolicy.namespace,
        spaceId: soClient.getCurrentNamespace(),
      });
    }

    // eslint-disable-next-line prefer-const
    let { version, ...restOfPackagePolicy } = packagePolicy;
    let inputs = getInputsWithStreamIds(restOfPackagePolicy, oldPackagePolicy.id);

    inputs = enforceFrozenInputs(oldPackagePolicy.inputs, inputs, options?.force);
    let elasticsearchPrivileges: NonNullable<PackagePolicy['elasticsearch']>['privileges'];
    let pkgInfo;
    if (packagePolicy.package?.name) {
      pkgInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: packagePolicy.package.name,
        pkgVersion: packagePolicy.package.version,
        prerelease: true,
      });
      _validateRestrictedFieldsNotModifiedOrThrow({
        pkgInfo,
        oldPackagePolicy,
        packagePolicyUpdate,
      });
      validatePackagePolicyOrThrow(packagePolicy, pkgInfo);

      if (await isSecretStorageEnabled(esClient, soClient)) {
        const secretsRes = await extractAndUpdateSecrets({
          oldPackagePolicy,
          packagePolicyUpdate: { ...restOfPackagePolicy, inputs },
          packageInfo: pkgInfo,
          esClient,
        });
        restOfPackagePolicy = secretsRes.packagePolicyUpdate;
        secretReferences = secretsRes.secretReferences;
        secretsToDelete = secretsRes.secretsToDelete;
        inputs = restOfPackagePolicy.inputs as PackagePolicyInput[];
      }
      const assetsMap = await getPackageAssetsMap({
        logger,
        packageInfo: pkgInfo,
        savedObjectsClient: soClient,
      });
      inputs = await _compilePackagePolicyInputs(
        pkgInfo,
        restOfPackagePolicy.vars || {},
        inputs,
        assetsMap
      );
      elasticsearchPrivileges = pkgInfo.elasticsearch?.privileges;

      const requiresRoot = isRootPrivilegesRequired(pkgInfo);
      if (restOfPackagePolicy.package && requiresRoot) {
        restOfPackagePolicy.package = {
          ...restOfPackagePolicy.package,
          requires_root: requiresRoot,
        };
      }
    }

    // Handle component template/mappings updates for experimental features, e.g. synthetic source
    await handleExperimentalDatastreamFeatureOptIn({
      soClient,
      esClient,
      packagePolicy: restOfPackagePolicy,
    });

    logger.debug(`Updating SO with revision ${oldPackagePolicy.revision + 1}`);
    await soClient.update<PackagePolicySOAttributes>(
      savedObjectType,
      id,
      {
        ...restOfPackagePolicy,
        ...(restOfPackagePolicy.package
          ? { package: omit(restOfPackagePolicy.package, 'experimental_data_stream_features') }
          : {}),
        inputs,
        ...(elasticsearchPrivileges && { elasticsearch: { privileges: elasticsearchPrivileges } }),
        ...(secretReferences?.length && { secret_references: secretReferences }),
        revision: oldPackagePolicy.revision + 1,
        updated_at: new Date().toISOString(),
        updated_by: options?.user?.username ?? 'system',
      },
      {
        version,
      }
    );

    const newPolicy = (await this.get(soClient, id)) as PackagePolicy;

    // if we have moved to an input package we need to create the index templates
    // for the package policy as input packages create index templates per package policy
    if (
      pkgInfo &&
      pkgInfo.type === 'input' &&
      oldPackagePolicy.package &&
      oldPackagePolicy.package?.version !== pkgInfo.version
    ) {
      if (oldPackagePolicy.package) {
        const oldPackage = await getPackageInfo({
          savedObjectsClient: soClient,
          pkgName: oldPackagePolicy.package?.name,
          pkgVersion: oldPackagePolicy.package?.version,
          prerelease: true,
        });

        if (oldPackage.type === 'integration') {
          await installAssetsForInputPackagePolicy({
            logger: appContextService.getLogger(),
            soClient,
            esClient,
            pkgInfo,
            packagePolicy: newPolicy,
            force: true,
          });
        }
      }
    }

    // Bump revision of all associated agent policies (old and new)
    const associatedPolicyIds = new Set([...oldPackagePolicy.policy_ids, ...newPolicy.policy_ids]);
    logger.debug(`Bumping revision of associated agent policies ${associatedPolicyIds}`);
    const bumpPromises = [];
    for (const policyId of associatedPolicyIds) {
      bumpPromises.push(
        agentPolicyService.bumpRevision(soClient, esClient, policyId, {
          user: options?.user,
        })
      );
    }

    const assetRemovePromise = removeOldAssets({
      soClient,
      pkgName: newPolicy.package!.name,
      currentVersion: newPolicy.package!.version,
    });
    const deleteSecretsPromise = secretsToDelete?.length
      ? deleteSecrets({ esClient, soClient, ids: secretsToDelete.map((s) => s.id) })
      : Promise.resolve();

    await Promise.all([...bumpPromises, assetRemovePromise, deleteSecretsPromise]);

    sendUpdatePackagePolicyTelemetryEvent(soClient, [packagePolicyUpdate], [oldPackagePolicy]);
    logger.debug(`Package policy ${id} update completed`);

    return newPolicy;
  }

  public async bulkUpdate(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicyUpdates: Array<NewPackagePolicy & { version?: string; id: string }>,
    options?: { user?: AuthenticatedUser; force?: boolean }
  ): Promise<{
    updatedPolicies: PackagePolicy[] | null;
    failedPolicies: Array<{
      packagePolicy: NewPackagePolicyWithId;
      error: Error | SavedObjectError;
    }>;
  }> {
    const logger = appContextService.getLogger();
    const savedObjectType = await getPackagePolicySavedObjectType();
    for (const packagePolicy of packagePolicyUpdates) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'update',
        id: packagePolicy.id,
        savedObjectType,
      });
    }
    const oldPackagePolicies = await this.getByIDs(
      soClient,
      packagePolicyUpdates.map((p) => p.id)
    );

    if (!oldPackagePolicies || oldPackagePolicies.length === 0) {
      throw new PackagePolicyNotFoundError('Package policy not found');
    }

    const packageInfos = await getPackageInfoForPackagePolicies(packagePolicyUpdates, soClient);
    const allSecretsToDelete: PolicySecretReference[] = [];

    const packageInfosandAssetsMap = await getPkgInfoAssetsMap({
      logger,
      packageInfos: [...packageInfos.values()],
      savedObjectsClient: soClient,
    });

    const policiesToUpdate: Array<SavedObjectsBulkUpdateObject<PackagePolicySOAttributes>> = [];
    const failedPolicies: Array<{
      packagePolicy: NewPackagePolicyWithId;
      error: Error | SavedObjectError;
    }> = [];

    const secretStorageEnabled = await isSecretStorageEnabled(esClient, soClient);

    await pMap(packagePolicyUpdates, async (packagePolicyUpdate) => {
      try {
        const id = packagePolicyUpdate.id;
        this.keepPolicyIdInSync(packagePolicyUpdate);
        const packagePolicy = { ...packagePolicyUpdate, name: packagePolicyUpdate.name.trim() };
        await preflightCheckPackagePolicy(soClient, packagePolicy);
        const oldPackagePolicy = oldPackagePolicies.find((p) => p.id === id);
        if (!oldPackagePolicy) {
          throw new PackagePolicyNotFoundError('Package policy not found');
        } else {
          this.keepPolicyIdInSync(oldPackagePolicy);
        }

        let secretReferences: PolicySecretReference[] | undefined;

        // id and version are not part of the saved object attributes
        // eslint-disable-next-line prefer-const
        let { version, id: _id, ...restOfPackagePolicy } = packagePolicy;

        if (packagePolicyUpdate.is_managed && !options?.force) {
          throw new PackagePolicyRestrictionRelatedError(`Cannot update package policy ${id}`);
        }

        let inputs = getInputsWithStreamIds(restOfPackagePolicy, oldPackagePolicy.id);

        inputs = enforceFrozenInputs(oldPackagePolicy.inputs, inputs, options?.force);
        let elasticsearchPrivileges: NonNullable<PackagePolicy['elasticsearch']>['privileges'];
        if (packagePolicy.package?.name) {
          const pkgInfoAndAsset = packageInfosandAssetsMap.get(
            `${packagePolicy.package.name}-${packagePolicy.package.version}`
          );
          if (pkgInfoAndAsset) {
            const { pkgInfo, assetsMap } = pkgInfoAndAsset;
            validatePackagePolicyOrThrow(packagePolicy, pkgInfo);
            if (secretStorageEnabled) {
              const secretsRes = await extractAndUpdateSecrets({
                oldPackagePolicy,
                packagePolicyUpdate: { ...restOfPackagePolicy, inputs },
                packageInfo: pkgInfo,
                esClient,
              });

              restOfPackagePolicy = secretsRes.packagePolicyUpdate;
              secretReferences = secretsRes.secretReferences;
              allSecretsToDelete.push(...secretsRes.secretsToDelete);
              inputs = restOfPackagePolicy.inputs as PackagePolicyInput[];
            }
            inputs = await _compilePackagePolicyInputs(
              pkgInfo,
              packagePolicy.vars || {},
              inputs,
              assetsMap
            );
            elasticsearchPrivileges = pkgInfo.elasticsearch?.privileges;

            const requiresRoot = isRootPrivilegesRequired(pkgInfo);
            if (restOfPackagePolicy.package && requiresRoot) {
              restOfPackagePolicy.package = {
                ...restOfPackagePolicy.package,
                requires_root: requiresRoot,
              };
            }
          }
        }

        // Handle component template/mappings updates for experimental features, e.g. synthetic source
        await handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy });

        policiesToUpdate.push({
          type: savedObjectType,
          id,
          attributes: {
            ...restOfPackagePolicy,
            ...(restOfPackagePolicy.package
              ? { package: omit(restOfPackagePolicy.package, 'experimental_data_stream_features') }
              : {}),
            inputs,
            ...(elasticsearchPrivileges && {
              elasticsearch: { privileges: elasticsearchPrivileges },
            }),
            ...(secretReferences?.length && { secret_references: secretReferences }),
            revision: oldPackagePolicy.revision + 1,
            updated_at: new Date().toISOString(),
            updated_by: options?.user?.username ?? 'system',
          },
          version,
        });
      } catch (error) {
        failedPolicies.push({ packagePolicy: packagePolicyUpdate, error });
      }
    });

    const { saved_objects: updatedPolicies } = await soClient.bulkUpdate<PackagePolicySOAttributes>(
      policiesToUpdate
    );

    // Bump revision of all associated agent policies (old and new)
    const associatedPolicyIds = new Set([
      ...packagePolicyUpdates.flatMap((p) => p.policy_ids),
      ...oldPackagePolicies.flatMap((p) => p.policy_ids),
    ]);
    logger.debug(`Bumping revision of associated agent policies ${associatedPolicyIds}`);
    const bumpPromise = pMap(associatedPolicyIds, async (agentPolicyId) => {
      await agentPolicyService.bumpRevision(soClient, esClient, agentPolicyId, {
        user: options?.user,
      });
    });

    const pkgVersions: Record<string, { name: string; version: string }> = {};
    packagePolicyUpdates.forEach(({ package: pkg }) => {
      if (pkg) {
        pkgVersions[pkg.name + '-' + pkg.version] = {
          name: pkg.name,
          version: pkg.version,
        };
      }
    });

    const removeAssetPromise = pMap(Object.keys(pkgVersions), async (pkgVersion) => {
      const { name, version } = pkgVersions[pkgVersion];
      await removeOldAssets({
        soClient,
        pkgName: name,
        currentVersion: version,
      });
    });

    const deleteSecretsPromise = allSecretsToDelete.length
      ? deleteSecrets({ esClient, soClient, ids: allSecretsToDelete.map((s) => s.id) })
      : Promise.resolve();

    await Promise.all([bumpPromise, removeAssetPromise, deleteSecretsPromise]);

    sendUpdatePackagePolicyTelemetryEvent(soClient, packagePolicyUpdates, oldPackagePolicies);

    updatedPolicies.forEach((policy) => {
      if (policy.error) {
        const hasAlreadyFailed = failedPolicies.some(
          (failedPolicy) => failedPolicy.packagePolicy.id === policy.id
        );
        if (!hasAlreadyFailed) {
          failedPolicies.push({
            packagePolicy: packagePolicyUpdates.find((p) => p.id === policy.id)!,
            error: policy.error,
          });
        }
      }
    });

    const updatedPoliciesSuccess = updatedPolicies
      .filter((policy) => !policy.error && policy.attributes)
      .map(
        (soPolicy) =>
          ({
            id: soPolicy.id,
            version: soPolicy.version,
            ...soPolicy.attributes,
          } as PackagePolicy)
      );

    return { updatedPolicies: updatedPoliciesSuccess, failedPolicies };
  }

  public async delete(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    ids: string[],
    options?: {
      user?: AuthenticatedUser;
      skipUnassignFromAgentPolicies?: boolean;
      force?: boolean;
    },
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ): Promise<PostDeletePackagePoliciesResponse> {
    const savedObjectType = await getPackagePolicySavedObjectType();
    for (const id of ids) {
      auditLoggingService.writeCustomSoAuditLog({
        action: 'delete',
        id,
        savedObjectType,
      });
    }

    const result: PostDeletePackagePoliciesResponse = [];
    const logger = appContextService.getLogger();
    logger.debug(`Deleting package policies ${ids}`);

    const packagePolicies = await this.getByIDs(soClient, ids, { ignoreMissing: true });
    if (!packagePolicies) {
      return [];
    }

    try {
      await packagePolicyService.runDeleteExternalCallbacks(
        packagePolicies,
        soClient,
        esClient,
        context,
        request
      );
    } catch (error) {
      logger.error(`An error occurred executing "packagePolicyDelete" callback: ${error}`);
      logger.error(error);
    }

    const uniqueAgentPolicyIds = [
      ...new Set(packagePolicies.flatMap((packagePolicy) => packagePolicy.policy_ids)),
    ];

    const hostedAgentPolicies: string[] = [];
    const agentlessAgentPolicies = [];

    for (const agentPolicyId of uniqueAgentPolicyIds) {
      try {
        const agentPolicy = await validateIsNotHostedPolicy(
          soClient,
          agentPolicyId,
          options?.force,
          'Cannot remove integrations of hosted agent policy'
        );
        // collect agentless agent policies to delete
        if (agentPolicy.supports_agentless) {
          agentlessAgentPolicies.push(agentPolicyId);
        }
      } catch (e) {
        hostedAgentPolicies.push(agentPolicyId);
      }
    }

    const idsToDelete: string[] = [];

    ids.forEach((id) => {
      try {
        const packagePolicy = packagePolicies.find((p) => p.id === id);

        if (!packagePolicy) {
          throw new PackagePolicyNotFoundError(`Saved object [${savedObjectType}/${id}] not found`);
        }

        if (packagePolicy.is_managed && !options?.force) {
          throw new PackagePolicyRestrictionRelatedError(`Cannot delete package policy ${id}`);
        }

        if (packagePolicy.policy_ids.some((policyId) => hostedAgentPolicies.includes(policyId))) {
          throw new HostedAgentPolicyRestrictionRelatedError(
            'Cannot remove integrations of hosted agent policy'
          );
        }

        idsToDelete.push(id);
      } catch (error) {
        result.push({
          id,
          success: false,
          ...fleetErrorToResponseOptions(error),
        });
      }
    });

    const secretsToDelete: string[] = [];
    if (idsToDelete.length > 0) {
      const { statuses } = await soClient.bulkDelete(
        idsToDelete.map((id) => ({ id, type: savedObjectType }))
      );

      statuses.forEach(({ id, success, error }) => {
        const packagePolicy = packagePolicies.find((p) => p.id === id);
        if (success && packagePolicy) {
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
            policy_ids: packagePolicy.policy_ids,
          });
          if (packagePolicy?.secret_references?.length) {
            secretsToDelete.push(...packagePolicy.secret_references.map((s) => s.id));
          }
        } else if (!success && error) {
          result.push({
            id,
            success: false,
            statusCode: error.statusCode,
            body: {
              message: error.message,
            },
          });
        }
      });
    }

    if (agentlessAgentPolicies.length > 0) {
      for (const agentPolicyId of agentlessAgentPolicies) {
        await agentPolicyService.delete(soClient, esClient, agentPolicyId, { force: true });
      }
    }

    if (!options?.skipUnassignFromAgentPolicies) {
      let uniquePolicyIdsR = [
        ...new Set(
          result
            .filter((r) => r.success && r.policy_ids && r.policy_ids.length > 0)
            .flatMap((r) => r.policy_ids!)
        ),
      ];
      uniquePolicyIdsR = without(uniquePolicyIdsR, ...agentlessAgentPolicies);

      const agentPoliciesWithEndpointPackagePolicies = result.reduce((acc, cur) => {
        if (cur.success && cur.policy_ids && cur.package?.name === 'endpoint') {
          for (const policyId of cur.policy_ids) {
            acc.add(policyId);
          }
        }
        return acc;
      }, new Set());

      const agentPolicies = await agentPolicyService.getByIDs(soClient, uniquePolicyIdsR);

      for (const policyId of uniquePolicyIdsR) {
        const agentPolicy = agentPolicies.find((p) => p.id === policyId);
        if (agentPolicy) {
          // is the agent policy attached to package policy with endpoint
          await agentPolicyService.bumpRevision(soClient, esClient, policyId, {
            user: options?.user,
            removeProtection: agentPoliciesWithEndpointPackagePolicies.has(policyId),
          });
        }
      }
    }

    if (secretsToDelete.length > 0) {
      await deleteSecrets({ esClient, soClient, ids: secretsToDelete });
    }

    try {
      await packagePolicyService.runPostDeleteExternalCallbacks(
        result,
        soClient,
        esClient,
        context,
        request
      );
      logger.debug(`Deleted package policies ${ids}`);
    } catch (error) {
      logger.error(`An error occurred executing "packagePolicyPostDelete" callback: ${error}`);
      logger.error(error);
    }

    return result;
  }

  // TODO should move out, public only for unit tests
  public async getUpgradePackagePolicyInfo(
    soClient: SavedObjectsClientContract,
    id: string,
    packagePolicy?: PackagePolicy,
    pkgVersion?: string
  ): Promise<{
    packagePolicy: PackagePolicy;
    packageInfo: PackageInfo;
    experimentalDataStreamFeatures: ExperimentalDataStreamFeature[];
  }> {
    if (!packagePolicy) {
      packagePolicy = (await this.get(soClient, id)) ?? undefined;
    }

    let experimentalDataStreamFeatures: ExperimentalDataStreamFeature[] = [];

    if (!pkgVersion && packagePolicy) {
      const installedPackage = await getInstallation({
        savedObjectsClient: soClient,
        pkgName: packagePolicy.package!.name,
      });

      if (!installedPackage) {
        throw new FleetError(
          i18n.translate('xpack.fleet.packagePolicy.packageNotInstalledError', {
            defaultMessage: 'Package {name} is not installed',
            values: {
              name: packagePolicy.package!.name,
            },
          })
        );
      }

      pkgVersion = installedPackage.version;
      experimentalDataStreamFeatures = installedPackage.experimental_data_stream_features ?? [];
    }

    let packageInfo: PackageInfo | undefined;

    if (packagePolicy) {
      packageInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: packagePolicy!.package!.name,
        pkgVersion: pkgVersion ?? '',
        prerelease: !!pkgVersion, // using prerelease only if version is specified
      });
    }

    this.validateUpgradePackagePolicy(id, packageInfo, packagePolicy);

    return {
      packagePolicy: packagePolicy!,
      packageInfo: packageInfo!,
      experimentalDataStreamFeatures,
    };
  }

  private validateUpgradePackagePolicy(
    id: string,
    packageInfo?: PackageInfo,
    packagePolicy?: PackagePolicy
  ) {
    if (!packagePolicy) {
      throw new FleetError(
        i18n.translate('xpack.fleet.packagePolicy.policyNotFoundError', {
          defaultMessage: 'Package policy with id {id} not found',
          values: { id },
        })
      );
    }

    if (!packagePolicy.package?.name) {
      throw new FleetError(
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
    options?: { user?: AuthenticatedUser; force?: boolean },
    packagePolicy?: PackagePolicy,
    pkgVersion?: string
  ): Promise<UpgradePackagePolicyResponse> {
    const result: UpgradePackagePolicyResponse = [];

    for (const id of ids) {
      try {
        const {
          packagePolicy: currentPackagePolicy,
          packageInfo,
          experimentalDataStreamFeatures,
        } = await this.getUpgradePackagePolicyInfo(soClient, id, packagePolicy, pkgVersion);

        if (currentPackagePolicy.is_managed && !options?.force) {
          throw new PackagePolicyRestrictionRelatedError(`Cannot upgrade package policy ${id}`);
        }

        await this.doUpgrade(
          soClient,
          esClient,
          id,
          currentPackagePolicy,
          result,
          packageInfo,
          experimentalDataStreamFeatures,
          options
        );
      } catch (error) {
        result.push({
          id,
          success: false,
          ...fleetErrorToResponseOptions(error),
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
    experimentalDataStreamFeatures: ExperimentalDataStreamFeature[],
    options?: { user?: AuthenticatedUser }
  ) {
    const updatePackagePolicy = updatePackageInputs(
      {
        ...omit(packagePolicy, 'id', 'spaceIds'),
        inputs: packagePolicy.inputs,
        package: {
          ...packagePolicy.package!,
          version: packageInfo.version,
        },
      },
      packageInfo,
      packageToPackagePolicyInputs(packageInfo) as InputsOverride[]
    );
    const assetsMap = await getPackageAssetsMap({
      logger: appContextService.getLogger(),
      packageInfo,
      savedObjectsClient: soClient,
    });
    updatePackagePolicy.inputs = await _compilePackagePolicyInputs(
      packageInfo,
      updatePackagePolicy.vars || {},
      updatePackagePolicy.inputs as PackagePolicyInput[],
      assetsMap
    );
    updatePackagePolicy.elasticsearch = packageInfo.elasticsearch;

    const updateOptions = {
      skipUniqueNameVerification: true,
      ...options,
    };

    await this.update(soClient, esClient, id, updatePackagePolicy, updateOptions);

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
      let experimentalDataStreamFeatures;

      ({ packagePolicy, packageInfo, experimentalDataStreamFeatures } =
        await this.getUpgradePackagePolicyInfo(soClient, id, packagePolicy, pkgVersion));
      const assetsMap = await getPackageAssetsMap({
        logger: appContextService.getLogger(),
        packageInfo,
        savedObjectsClient: soClient,
      });

      // Ensure the experimental features from the Installation saved object come through on the package policy
      // during an upgrade dry run
      if (packagePolicy.package) {
        packagePolicy.package.experimental_data_stream_features = experimentalDataStreamFeatures;
      }

      return this.calculateDiff(soClient, packagePolicy, packageInfo, assetsMap);
    } catch (error) {
      return {
        hasErrors: true,
        ...fleetErrorToResponseOptions(error),
      };
    }
  }

  private async calculateDiff(
    soClient: SavedObjectsClientContract,
    packagePolicy: PackagePolicy,
    packageInfo: PackageInfo,
    assetsMap: AssetsMap
  ): Promise<UpgradePackagePolicyDryRunResponseItem> {
    const updatedPackagePolicy = updatePackageInputs(
      {
        ...omit(packagePolicy, 'id', 'spaceIds'),
        inputs: packagePolicy.inputs,
        package: {
          ...packagePolicy.package!,
          version: packageInfo.version,
          experimental_data_stream_features:
            packagePolicy.package?.experimental_data_stream_features,
        },
      },
      packageInfo,
      packageToPackagePolicyInputs(packageInfo) as InputsOverride[],
      true
    );
    updatedPackagePolicy.inputs = await _compilePackagePolicyInputs(
      packageInfo,
      updatedPackagePolicy.vars || {},
      updatedPackagePolicy.inputs as PackagePolicyInput[],
      assetsMap
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
      appContextService.getLogger().debug(() => JSON.stringify(upgradeTelemetry));
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
        newPackagePolicy = {
          ...newPP,
          name: newPolicy.name,
          namespace: newPolicy?.namespace ?? '',
          description: newPolicy.description ?? '',
          enabled: newPolicy.enabled ?? true,
          package: {
            ...newPP.package!,
            experimental_data_stream_features: newPolicy.package?.experimental_data_stream_features,
          },
          policy_id: newPolicy.policy_id ?? undefined,
          policy_ids: newPolicy.policy_ids ?? undefined,
          output_id: newPolicy.output_id,
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
      skipArchive: true,
      prerelease: true,
    });
    if (packageInfo) {
      return packageToPackagePolicy(packageInfo, '');
    }
  }

  public async buildPackagePolicyFromPackage(
    soClient: SavedObjectsClientContract,
    pkgName: string,
    logger?: Logger
  ): Promise<NewPackagePolicy | undefined> {
    const pkgInstall = await getInstallation({ savedObjectsClient: soClient, pkgName, logger });
    if (pkgInstall) {
      const packageInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: pkgInstall.name,
        pkgVersion: pkgInstall.version,
        prerelease: true,
      });

      if (packageInfo) {
        return packageToPackagePolicy(packageInfo, '');
      }
    }
  }

  public async runExternalCallbacks<A extends ExternalCallback[0]>(
    externalCallbackType: A,
    packagePolicy: A extends 'packagePolicyDelete'
      ? DeletePackagePoliciesResponse
      : A extends 'packagePolicyPostDelete'
      ? PostDeletePackagePoliciesResponse
      : A extends 'packagePolicyPostCreate'
      ? PackagePolicy
      : A extends 'packagePolicyCreate'
      ? NewPackagePolicy
      : never,
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ): Promise<
    A extends 'packagePolicyDelete'
      ? void
      : A extends 'packagePolicyPostDelete'
      ? void
      : A extends 'packagePolicyPostCreate'
      ? PackagePolicy
      : A extends 'packagePolicyCreate'
      ? NewPackagePolicy
      : never
  >;
  public async runExternalCallbacks(
    externalCallbackType: ExternalCallback[0],
    packagePolicy:
      | PackagePolicy
      | NewPackagePolicy
      | PostDeletePackagePoliciesResponse
      | DeletePackagePoliciesResponse,
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ): Promise<PackagePolicy | NewPackagePolicy | void> {
    const logger = appContextService.getLogger();
    const numberOfCallbacks = appContextService.getExternalCallbacks(externalCallbackType)?.size;
    logger.debug(`Running ${numberOfCallbacks} external callbacks for ${externalCallbackType}`);
    try {
      if (externalCallbackType === 'packagePolicyPostDelete') {
        return await this.runPostDeleteExternalCallbacks(
          packagePolicy as PostDeletePackagePoliciesResponse,
          soClient,
          esClient,
          context,
          request
        );
      } else if (externalCallbackType === 'packagePolicyDelete') {
        return await this.runDeleteExternalCallbacks(
          packagePolicy as DeletePackagePoliciesResponse,
          soClient,
          esClient
        );
      } else {
        if (!Array.isArray(packagePolicy)) {
          let newData = packagePolicy;
          const externalCallbacks = appContextService.getExternalCallbacks(externalCallbackType);
          if (externalCallbacks && externalCallbacks.size > 0) {
            let updatedNewData = newData;
            for (const callback of externalCallbacks) {
              let result;
              if (externalCallbackType === 'packagePolicyPostCreate') {
                result = await (callback as PostPackagePolicyPostCreateCallback)(
                  updatedNewData as PackagePolicy,
                  soClient,
                  esClient,
                  context,
                  request
                );
                updatedNewData = PackagePolicySchema.validate(result) as NewPackagePolicy;
              } else {
                result = await (callback as PostPackagePolicyCreateCallback)(
                  updatedNewData as NewPackagePolicy,
                  soClient,
                  esClient,
                  context,
                  request
                );
              }

              if (externalCallbackType === 'packagePolicyCreate') {
                updatedNewData = NewPackagePolicySchema.validate(result) as NewPackagePolicy;
              } else if (externalCallbackType === 'packagePolicyUpdate') {
                const omitted = {
                  ...omit(result, [
                    'id',
                    'spaceIds',
                    'version',
                    'revision',
                    'updated_at',
                    'updated_by',
                    'created_at',
                    'created_by',
                    'elasticsearch',
                  ]),
                  inputs: result.inputs.map((input) => omit(input, ['compiled_input'])),
                };

                updatedNewData = UpdatePackagePolicySchema.validate(omitted) as PackagePolicy;
              }
            }

            newData = updatedNewData;
          }
          return newData;
        }
      }
    } catch (error) {
      logger.error(`Error running external callbacks for ${externalCallbackType}:`);
      logger.error(error);
      throw error;
    }
  }

  public async runPostDeleteExternalCallbacks(
    deletedPackagePolicies: PostDeletePackagePoliciesResponse,
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ): Promise<void> {
    const externalCallbacks = appContextService.getExternalCallbacks('packagePolicyPostDelete');
    const errorsThrown: Error[] = [];

    if (externalCallbacks && externalCallbacks.size > 0) {
      for (const callback of externalCallbacks) {
        // Failures from an external callback should not prevent other external callbacks from being
        // executed. Errors (if any) will be collected and `throw`n after processing the entire set
        try {
          await callback(deletedPackagePolicies, soClient, esClient, context, request);
        } catch (error) {
          errorsThrown.push(error);
        }
      }

      if (errorsThrown.length > 0) {
        throw new FleetError(
          `${errorsThrown.length} encountered while executing package post delete external callbacks`,
          errorsThrown
        );
      }
    }
  }

  public async runDeleteExternalCallbacks(
    deletedPackagePolices: DeletePackagePoliciesResponse,
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient
  ): Promise<void> {
    const externalCallbacks = appContextService.getExternalCallbacks('packagePolicyDelete');
    const errorsThrown: Error[] = [];

    if (externalCallbacks && externalCallbacks.size > 0) {
      for (const callback of externalCallbacks) {
        // Failures from an external callback should not prevent other external callbacks from being
        // executed. Errors (if any) will be collected and `throw`n after processing the entire set
        try {
          await callback(deletedPackagePolices, soClient, esClient);
        } catch (error) {
          errorsThrown.push(error);
        }
      }

      if (errorsThrown.length > 0) {
        throw new FleetError(
          `${errorsThrown.length} encountered while executing package delete external callbacks`,
          errorsThrown
        );
      }
    }
  }

  public async removeOutputFromAll(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    outputId: string
  ) {
    const savedObjectType = await getPackagePolicySavedObjectType();
    const packagePolicies = (
      await soClient.find<PackagePolicySOAttributes>({
        type: savedObjectType,
        fields: ['name', 'enabled', 'policy_ids', 'inputs', 'output_id'],
        searchFields: ['output_id'],
        search: escapeSearchQueryPhrase(outputId),
        perPage: SO_SEARCH_LIMIT,
      })
    ).saved_objects.map(mapPackagePolicySavedObjectToPackagePolicy);

    if (packagePolicies.length > 0) {
      const getPackagePolicyUpdate = (packagePolicy: PackagePolicy) => ({
        name: packagePolicy.name,
        enabled: packagePolicy.enabled,
        policy_ids: packagePolicy.policy_ids,
        inputs: packagePolicy.inputs,
        output_id: packagePolicy.output_id === outputId ? null : packagePolicy.output_id,
      });

      // Validate that the new cleared/default output is valid for the package policies
      // (from each of the associated agent policies) before updating any of them
      await pMap(
        packagePolicies,
        async (packagePolicy) => {
          const existingPackagePolicy = await this.get(soClient, packagePolicy.id);

          if (!existingPackagePolicy) {
            throw new PackagePolicyNotFoundError('Package policy not found');
          }

          for (const policyId of packagePolicy.policy_ids) {
            if (packagePolicy.package?.name) {
              const agentPolicy = await agentPolicyService.get(soClient, policyId, true);
              if (agentPolicy) {
                await validateAgentPolicyOutputForIntegration(
                  soClient,
                  agentPolicy,
                  packagePolicy.package.name,
                  false
                );
              }
            }
          }
        },
        {
          concurrency: 50,
        }
      );
      await pMap(
        packagePolicies,
        (packagePolicy) => {
          return this.update(
            soClient,
            esClient,
            packagePolicy.id,
            getPackagePolicyUpdate(packagePolicy)
          );
        },
        {
          concurrency: 50,
        }
      );
    }
  }

  async fetchAllItemIds(
    soClient: SavedObjectsClientContract,
    { perPage = 1000, kuery }: PackagePolicyClientFetchAllItemIdsOptions = {}
  ): Promise<AsyncIterable<string[]>> {
    // TODO:PT Question for fleet team: do I need to `auditLoggingService.writeCustomSoAuditLog()` here? Its only IDs
    const savedObjectType = await getPackagePolicySavedObjectType();

    return createSoFindIterable<{}>({
      soClient,
      findRequest: {
        type: savedObjectType,
        perPage,
        sortField: 'created_at',
        sortOrder: 'asc',
        fields: [],
        filter: kuery ? normalizeKuery(savedObjectType, kuery) : undefined,
      },
      resultsMapper: (data) => {
        return data.saved_objects.map((packagePolicySO) => packagePolicySO.id);
      },
    });
  }

  async fetchAllItems(
    soClient: SavedObjectsClientContract,
    {
      perPage = 1000,
      kuery,
      sortOrder = 'asc',
      sortField = 'created_at',
    }: PackagePolicyClientFetchAllItemsOptions = {}
  ): Promise<AsyncIterable<PackagePolicy[]>> {
    const savedObjectType = await getPackagePolicySavedObjectType();

    return createSoFindIterable<PackagePolicySOAttributes>({
      soClient,
      findRequest: {
        type: savedObjectType,
        sortField,
        sortOrder,
        perPage,
        filter: kuery ? normalizeKuery(savedObjectType, kuery) : undefined,
      },
      resultsMapper(data) {
        return data.saved_objects.map((packagePolicySO) => {
          auditLoggingService.writeCustomSoAuditLog({
            action: 'find',
            id: packagePolicySO.id,
            savedObjectType,
          });

          return mapPackagePolicySavedObjectToPackagePolicy(packagePolicySO);
        });
      },
    });
  }
}

export class PackagePolicyServiceImpl
  extends PackagePolicyClientImpl
  implements PackagePolicyService
{
  public asScoped(request: KibanaRequest): PackagePolicyClient {
    const preflightCheck = async ({ fleetAuthz: fleetRequiredAuthz }: FleetAuthzRouteConfig) => {
      const authz = await getAuthzFromRequest(request);

      if (doesNotHaveRequiredFleetAuthz(authz, fleetRequiredAuthz)) {
        throw new FleetUnauthorizedError('Not authorized to this action on integration policies');
      }

      if ((await isSpaceAwarenessMigrationPending()) === true) {
        throw new FleetError('Migration to space awareness is pending');
      }
    };

    return new PackagePolicyClientWithAuthz(preflightCheck);
  }

  public get asInternalUser() {
    const preflightCheck = async () => {
      if ((await isSpaceAwarenessMigrationPending()) === true) {
        throw new FleetError('Migration to space awareness is pending');
      }
    };
    return new PackagePolicyClientWithAuthz(preflightCheck);
  }
}

class PackagePolicyClientWithAuthz extends PackagePolicyClientImpl {
  constructor(
    private readonly preflightCheck?: (
      fleetAuthzConfig: FleetAuthzRouteConfig
    ) => void | Promise<void>
  ) {
    super();
  }

  #runPreflight = async (fleetAuthzConfig: FleetAuthzRouteConfig) => {
    if (this.preflightCheck) {
      return await this.preflightCheck(fleetAuthzConfig);
    }
  };

  async bulkCreate(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicies: NewPackagePolicyWithId[],
    options?:
      | {
          user?: AuthenticatedUser | undefined;
          bumpRevision?: boolean | undefined;
          force?: true | undefined;
        }
      | undefined
  ): Promise<{
    created: PackagePolicy[];
    failed: Array<{ packagePolicy: NewPackagePolicy; error?: Error | SavedObjectError }>;
  }> {
    await this.#runPreflight({
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
    });
    return super.bulkCreate(soClient, esClient, packagePolicies, options);
  }

  async update(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    id: string,
    packagePolicyUpdate: UpdatePackagePolicy,
    options?:
      | {
          user?: AuthenticatedUser | undefined;
          force?: boolean | undefined;
          skipUniqueNameVerification?: boolean | undefined;
        }
      | undefined
  ): Promise<PackagePolicy> {
    await this.#runPreflight({
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
    });

    return super.update(soClient, esClient, id, packagePolicyUpdate, options);
  }

  async create(
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient,
    packagePolicy: NewPackagePolicy,
    options?: {
      authorizationHeader?: HTTPAuthorizationHeader | null;
      spaceId?: string;
      id?: string;
      user?: AuthenticatedUser;
      bumpRevision?: boolean;
      force?: boolean;
      skipEnsureInstalled?: boolean;
      skipUniqueNameVerification?: boolean;
      overwrite?: boolean;
      packageInfo?: PackageInfo;
    },
    context?: RequestHandlerContext,
    request?: KibanaRequest
  ): Promise<PackagePolicy> {
    await this.#runPreflight({
      fleetAuthz: {
        integrations: { writeIntegrationPolicies: true },
      },
    });

    return super.create(soClient, esClient, packagePolicy, options, context, request);
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

// the option `allEnabled` is only used to generate inputs integration templates where everything is enabled by default
// it shouldn't be used in the normal install flow
export function getInputsWithStreamIds(
  packagePolicy: NewPackagePolicy,
  packagePolicyId?: string,
  allEnabled?: boolean
): PackagePolicy['inputs'] {
  return packagePolicy.inputs.map((input) => {
    return {
      ...input,
      enabled: !!allEnabled ? true : input.enabled,
      streams: input.streams.map((stream) => ({
        ...stream,
        enabled: !!allEnabled ? true : stream.enabled,
        id: packagePolicyId
          ? `${input.type}-${stream.data_stream.dataset}-${packagePolicyId}`
          : `${input.type}-${stream.data_stream.dataset}`,
      })),
    };
  });
}

export async function _compilePackagePolicyInputs(
  pkgInfo: PackageInfo,
  vars: PackagePolicy['vars'],
  inputs: PackagePolicyInput[],
  assetsMap: AssetsMap
): Promise<PackagePolicyInput[]> {
  const inputsPromises = inputs.map(async (input) => {
    const compiledInput = await _compilePackagePolicyInput(pkgInfo, vars, input, assetsMap);
    const compiledStreams = await _compilePackageStreams(pkgInfo, vars, input, assetsMap);
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
  input: PackagePolicyInput,
  assetsMap: AssetsMap
) {
  const packagePolicyTemplate = input.policy_template
    ? pkgInfo.policy_templates?.find(
        (policyTemplate) => policyTemplate.name === input.policy_template
      )
    : pkgInfo.policy_templates?.[0];

  if (!input.enabled || !packagePolicyTemplate) {
    return undefined;
  }

  const packageInputs = getNormalizedInputs(packagePolicyTemplate);

  if (!packageInputs.length) {
    return undefined;
  }

  const packageInput = packageInputs.find((pkgInput) => pkgInput.type === input.type);
  if (!packageInput) {
    throw new InputNotFoundError(
      `Input template not found, unable to find input type ${input.type}`
    );
  }
  if (!packageInput.template_path) {
    return undefined;
  }

  const [pkgInputTemplate] = await getAssetsDataFromAssetsMap(pkgInfo, assetsMap, (path: string) =>
    path.endsWith(`/agent/input/${packageInput.template_path!}`)
  );

  if (!pkgInputTemplate || !pkgInputTemplate.buffer) {
    throw new InputNotFoundError(
      `Unable to load input template at /agent/input/${packageInput.template_path!}`
    );
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
  input: PackagePolicyInput,
  assetsMap: AssetsMap
) {
  const streamsPromises = input.streams.map((stream) =>
    _compilePackageStream(pkgInfo, vars, input, stream, assetsMap)
  );

  return await Promise.all(streamsPromises);
}

// temporary export to enable testing pending refactor https://github.com/elastic/kibana/issues/112386
// TODO: Move this logic into `package_policies_to_agent_permissions.ts` since this is not a package policy concern
// and is based entirely on the package contents
export function _applyIndexPrivileges(
  packageDataStream: RegistryDataStream,
  stream: PackagePolicyInputStream
): PackagePolicyInputStream {
  const streamOut = cloneDeep(stream);

  if (packageDataStream?.elasticsearch?.dynamic_dataset) {
    streamOut.data_stream.elasticsearch = streamOut.data_stream.elasticsearch ?? {};
    streamOut.data_stream.elasticsearch.dynamic_dataset =
      packageDataStream.elasticsearch.dynamic_dataset;
  }
  if (packageDataStream?.elasticsearch?.dynamic_namespace) {
    streamOut.data_stream.elasticsearch = streamOut.data_stream.elasticsearch ?? {};
    streamOut.data_stream.elasticsearch.dynamic_namespace =
      packageDataStream.elasticsearch.dynamic_namespace;
  }

  const indexPrivileges = packageDataStream?.elasticsearch?.privileges?.indices;

  if (!indexPrivileges?.length) {
    return streamOut;
  }

  const isServerless = appContextService.getCloud()?.isServerlessEnabled;
  const DATA_STREAM_ALLOWED_INDEX_PRIVILEGES = new Set([
    'auto_configure',
    'create_doc',
    'maintenance',
    'monitor',
    'read',
    ...(isServerless ? [] : ['read_cross_cluster']),
  ]);
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
    streamOut.data_stream.elasticsearch = streamOut.data_stream.elasticsearch ?? {};
    streamOut.data_stream.elasticsearch.privileges = {
      indices: valid,
    };
  }

  return streamOut;
}

async function _compilePackageStream(
  pkgInfo: PackageInfo,
  vars: PackagePolicy['vars'],
  input: PackagePolicyInput,
  streamIn: PackagePolicyInputStream,
  assetsMap: AssetsMap
) {
  let stream = streamIn;

  if (!stream.enabled) {
    return { ...stream, compiled_stream: undefined };
  }

  const packageDataStreams = getNormalizedDataStreams(pkgInfo);
  if (!packageDataStreams) {
    throw new StreamNotFoundError('Stream template not found, no data streams');
  }

  const packageDataStream = packageDataStreams.find(
    (pkgDataStream) => pkgDataStream.dataset === stream.data_stream.dataset
  );

  if (!packageDataStream) {
    throw new StreamNotFoundError(
      `Stream template not found, unable to find dataset ${stream.data_stream.dataset}`
    );
  }

  stream = _applyIndexPrivileges(packageDataStream, streamIn);

  const streamFromPkg = (packageDataStream.streams || []).find(
    (pkgStream) => pkgStream.input === input.type
  );
  if (!streamFromPkg) {
    throw new StreamNotFoundError(
      `Stream template not found, unable to find stream for input ${input.type}`
    );
  }

  if (!streamFromPkg.template_path) {
    throw new StreamNotFoundError(
      `Stream template path not found for dataset ${stream.data_stream.dataset}`
    );
  }

  const datasetPath = packageDataStream.path;

  const [pkgStreamTemplate] = await getAssetsDataFromAssetsMap(
    pkgInfo,
    assetsMap,
    (path: string) => path.endsWith(streamFromPkg.template_path),
    datasetPath
  );

  if (!pkgStreamTemplate || !pkgStreamTemplate.buffer) {
    throw new StreamNotFoundError(
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

export interface NewPackagePolicyWithId extends NewPackagePolicy {
  id?: string;
  policy_id?: string | null;
  version?: string;
}

export const packagePolicyService: PackagePolicyClient = new PackagePolicyClientImpl();

async function getPackageInfoForPackagePolicies(
  packagePolicies: NewPackagePolicyWithId[],
  soClient: SavedObjectsClientContract
) {
  const pkgInfoMap = new Map<string, PackagePolicyPackage>();

  packagePolicies.forEach(({ package: pkg }) => {
    if (pkg) {
      pkgInfoMap.set(`${pkg.name}-${pkg.version}`, pkg);
    }
  });

  const resultMap = new Map<string, PackageInfo>();

  await pMap(pkgInfoMap.keys(), async (pkgKey) => {
    const pkgInfo = pkgInfoMap.get(pkgKey);
    if (pkgInfo) {
      const pkgInfoData = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: pkgInfo.name,
        pkgVersion: pkgInfo.version,
        prerelease: true,
      });

      resultMap.set(pkgKey, pkgInfoData);
    }
  });

  return resultMap;
}

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
      const policyTemplateStillIncludesInput = isInputOnlyPolicyTemplate(policyTemplate)
        ? policyTemplate.input === input.type
        : policyTemplate.inputs?.some(
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
      const isInputPkgUpdate =
        packageInfo.type === 'input' &&
        update.streams.length === 1 &&
        originalInput?.streams.length === 1;

      for (const stream of update.streams) {
        let originalStream = originalInput?.streams.find(
          (s) => s.data_stream.dataset === stream.data_stream.dataset
        );

        // this handles the input only pkg case where the new stream cannot have a dataset name
        // so will never match. Input only packages only ever have one stream.
        if (!originalStream && isInputPkgUpdate) {
          originalStream = {
            ...update.streams[0],
            vars: originalInput?.streams[0].vars,
          };
        }

        if (originalStream === undefined) {
          originalInput.streams.push(stream);
          continue;
        }

        if (originalStream?.enabled === undefined) {
          originalStream.enabled = stream.enabled;
        }

        if (stream.vars) {
          // streams wont match for input pkgs
          const indexOfStream = isInputPkgUpdate
            ? 0
            : originalInput.streams.indexOf(originalStream);
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

// input only packages cannot have their namespace or dataset modified
export function _validateRestrictedFieldsNotModifiedOrThrow(opts: {
  pkgInfo: PackageInfo;
  oldPackagePolicy: PackagePolicy;
  packagePolicyUpdate: UpdatePackagePolicy;
}) {
  const { pkgInfo, oldPackagePolicy, packagePolicyUpdate } = opts;

  if (pkgInfo.type !== 'input') return;

  const { namespace, inputs } = packagePolicyUpdate;
  if (namespace && namespace !== oldPackagePolicy.namespace) {
    throw new PackagePolicyValidationError(
      i18n.translate('xpack.fleet.updatePackagePolicy.namespaceCannotBeModified', {
        defaultMessage:
          'Package policy namespace cannot be modified for input only packages, please create a new package policy.',
      })
    );
  }

  if (inputs) {
    for (const input of inputs) {
      const oldInput = oldPackagePolicy.inputs.find((i) => i.id === input.id);
      if (oldInput) {
        for (const stream of input.streams || []) {
          const oldStream = oldInput.streams.find(
            (s) => s.data_stream.dataset === stream.data_stream.dataset
          );
          if (
            oldStream &&
            oldStream?.vars?.[DATASET_VAR_NAME] &&
            oldStream?.vars[DATASET_VAR_NAME]?.value !== stream?.vars?.[DATASET_VAR_NAME]?.value
          ) {
            // seeing this error in dev? Package policy must be called with prepareInputPackagePolicyDataset function first in UI code
            appContextService
              .getLogger()
              .debug(
                () =>
                  `Rejecting package policy update due to dataset change, old val '${
                    oldStream.vars![DATASET_VAR_NAME].value
                  }, new val '${JSON.stringify(stream?.vars?.[DATASET_VAR_NAME]?.value)}'`
              );
            throw new PackagePolicyValidationError(
              i18n.translate('xpack.fleet.updatePackagePolicy.datasetCannotBeModified', {
                defaultMessage:
                  'Package policy dataset cannot be modified for input only packages, please create a new package policy.',
              })
            );
          }
        }
      }
    }
  }
}

async function validateIsNotHostedPolicy(
  soClient: SavedObjectsClientContract,
  id: string,
  force = false,
  errorMessage?: string
): Promise<AgentPolicy> {
  const agentPolicy = await agentPolicyService.get(soClient, id, false);

  if (!agentPolicy) {
    throw new AgentPolicyNotFoundError('Agent policy not found');
  }

  const isManagedPolicyWithoutServerlessSupport =
    agentPolicy.is_managed && !agentPolicy.supports_agentless && !force;

  if (isManagedPolicyWithoutServerlessSupport) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      errorMessage ?? `Cannot update integrations of hosted agent policy ${id}`
    );
  }

  return agentPolicy;
}

export function sendUpdatePackagePolicyTelemetryEvent(
  soClient: SavedObjectsClientContract,
  updatedPkgPolicies: UpdatePackagePolicy[],
  oldPackagePolicies: UpdatePackagePolicy[]
) {
  updatedPkgPolicies.forEach((updatedPkgPolicy) => {
    if (updatedPkgPolicy.package) {
      const { name, version } = updatedPkgPolicy.package;
      const oldPkgPolicy = oldPackagePolicies.find(
        (packagePolicy) => packagePolicy.id === updatedPkgPolicy.id
      );
      const oldVersion = oldPkgPolicy?.package?.version;
      if (oldVersion && oldVersion !== version) {
        const upgradeTelemetry: PackageUpdateEvent = {
          packageName: name,
          currentVersion: oldVersion,
          newVersion: version,
          status: 'success',
          eventType: 'package-policy-upgrade' as UpdateEventType,
        };
        sendTelemetryEvents(
          appContextService.getLogger(),
          appContextService.getTelemetryEventsSender(),
          upgradeTelemetry
        );
        appContextService.getLogger().info(`Package policy upgraded successfully`);
        appContextService.getLogger().debug(() => JSON.stringify(upgradeTelemetry));
      }
    }
  });
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

async function requireUniqueName(
  soClient: SavedObjectsClientContract,
  packagePolicy: UpdatePackagePolicy | NewPackagePolicy,
  id?: string
) {
  const savedObjectType = await getPackagePolicySavedObjectType();
  const existingPoliciesWithName = await packagePolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    kuery: `${savedObjectType}.name:"${packagePolicy.name}"`,
  });

  const policiesToCheck = id
    ? // Check that the name does not exist already but exclude the current package policy
      (existingPoliciesWithName?.items || []).filter((p) => p.id !== id)
    : existingPoliciesWithName?.items;

  if (policiesToCheck.length > 0) {
    throw new PackagePolicyNameExistsError(
      `An integration policy with the name ${packagePolicy.name} already exists. Please rename it or choose a different name.`
    );
  }
}
