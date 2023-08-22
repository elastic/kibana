/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import { chunk, isEmpty, isEqual, keyBy } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type Logger, type SavedObjectsClientContract } from '@kbn/core/server';
import {
  ENDPOINT_BLOCKLISTS_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
  ENDPOINT_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import type { ListResult, PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Artifact, PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { AppFeatures } from '../../../../lib/app_features';
import { AppFeatureKey, type ExperimentalFeatures } from '../../../../../common';
import type { ManifestSchemaVersion } from '../../../../../common/endpoint/schema/common';
import {
  manifestDispatchSchema,
  type ManifestSchema,
} from '../../../../../common/endpoint/schema/manifest';

import {
  ArtifactConstants,
  type ArtifactListId,
  buildArtifact,
  convertExceptionsToEndpointFormat,
  getAllItemsFromEndpointExceptionList,
  getArtifactId,
  Manifest,
} from '../../../lib/artifacts';

import {
  internalArtifactCompleteSchema,
  type InternalArtifactCompleteSchema,
  type WrappedTranslatedExceptionList,
} from '../../../schemas/artifacts';
import type { EndpointArtifactClientInterface } from '../artifact_client';
import { ManifestClient } from '../manifest_client';
import { InvalidInternalManifestError } from '../errors';
import { wrapErrorIfNeeded } from '../../../utils';
import { EndpointError } from '../../../../../common/endpoint/errors';

interface ArtifactsBuildResult {
  defaultArtifacts: InternalArtifactCompleteSchema[];
  policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]>;
}

interface BuildArtifactsForOsOptions {
  listId: ArtifactListId;
  name: string;
}

const iterateArtifactsBuildResult = (
  result: ArtifactsBuildResult,
  callback: (artifact: InternalArtifactCompleteSchema, policyId?: string) => void
) => {
  for (const artifact of result.defaultArtifacts) {
    callback(artifact);
  }

  for (const policyId of Object.keys(result.policySpecificArtifacts)) {
    for (const artifact of result.policySpecificArtifacts[policyId]) {
      callback(artifact, policyId);
    }
  }
};

const iterateAllListItems = async <T>(
  pageSupplier: (page: number, perPage: number) => Promise<ListResult<T>>,
  itemCallback: (items: T[]) => void
) => {
  let paging = true;
  let page = 1;
  const perPage = 1000;

  while (paging) {
    const { items, total } = await pageSupplier(page, perPage);

    itemCallback(items);

    paging = (page - 1) * perPage + items.length < total;
    page++;
  }
};

export interface ManifestManagerContext {
  savedObjectsClient: SavedObjectsClientContract;
  artifactClient: EndpointArtifactClientInterface;
  exceptionListClient: ExceptionListClient;
  packagePolicyService: PackagePolicyClient;
  logger: Logger;
  experimentalFeatures: ExperimentalFeatures;
  packagerTaskPackagePolicyUpdateBatchSize: number;
  esClient: ElasticsearchClient;
  appFeatures: AppFeatures;
}

const getArtifactIds = (manifest: ManifestSchema) =>
  [...Object.keys(manifest.artifacts)].map(
    (key) => `${key}-${manifest.artifacts[key].decoded_sha256}`
  );

const manifestsEqual = (manifest1: ManifestSchema, manifest2: ManifestSchema) =>
  isEqual(new Set(getArtifactIds(manifest1)), new Set(getArtifactIds(manifest2)));

export class ManifestManager {
  protected artifactClient: EndpointArtifactClientInterface;
  protected exceptionListClient: ExceptionListClient;
  protected packagePolicyService: PackagePolicyClient;
  protected savedObjectsClient: SavedObjectsClientContract;
  protected logger: Logger;
  protected schemaVersion: ManifestSchemaVersion;
  protected experimentalFeatures: ExperimentalFeatures;
  protected cachedExceptionsListsByOs: Map<string, ExceptionListItemSchema[]>;
  protected packagerTaskPackagePolicyUpdateBatchSize: number;
  protected esClient: ElasticsearchClient;
  protected appFeatures: AppFeatures;

  constructor(context: ManifestManagerContext) {
    this.artifactClient = context.artifactClient;
    this.exceptionListClient = context.exceptionListClient;
    this.packagePolicyService = context.packagePolicyService;
    this.savedObjectsClient = context.savedObjectsClient;
    this.logger = context.logger;
    this.schemaVersion = 'v1';
    this.experimentalFeatures = context.experimentalFeatures;
    this.cachedExceptionsListsByOs = new Map();
    this.packagerTaskPackagePolicyUpdateBatchSize =
      context.packagerTaskPackagePolicyUpdateBatchSize;
    this.esClient = context.esClient;
    this.appFeatures = context.appFeatures;
  }

  /**
   * Gets a ManifestClient for this manager's schemaVersion.
   *
   * @returns {ManifestClient} A ManifestClient scoped to the appropriate schemaVersion.
   */
  protected getManifestClient(): ManifestClient {
    return new ManifestClient(this.savedObjectsClient, this.schemaVersion);
  }

  /**
   * Search or get exceptions from the cached map by listId and OS and filter those by policyId/global
   */
  protected async getCachedExceptions({
    elClient,
    listId,
    os,
    policyId,
    schemaVersion,
  }: {
    elClient: ExceptionListClient;
    listId: ArtifactListId;
    os: string;
    policyId?: string;
    schemaVersion: string;
  }): Promise<WrappedTranslatedExceptionList> {
    if (!this.cachedExceptionsListsByOs.has(`${listId}-${os}`)) {
      let itemsByListId: ExceptionListItemSchema[] = [];
      if (
        (listId === ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID &&
          this.appFeatures.isEnabled(AppFeatureKey.endpointResponseActions)) ||
        (listId !== ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID &&
          this.appFeatures.isEnabled(AppFeatureKey.endpointArtifactManagement))
      ) {
        itemsByListId = await getAllItemsFromEndpointExceptionList({
          elClient,
          os,
          listId,
        });
      }
      this.cachedExceptionsListsByOs.set(`${listId}-${os}`, itemsByListId);
    }

    const allExceptionsByListId = this.cachedExceptionsListsByOs.get(`${listId}-${os}`);
    if (!allExceptionsByListId) {
      throw new InvalidInternalManifestError(`Error getting exceptions for ${listId}-${os}`);
    }

    const filter = (exception: ExceptionListItemSchema) =>
      policyId
        ? exception.tags.includes('policy:all') || exception.tags.includes(`policy:${policyId}`)
        : exception.tags.includes('policy:all');

    const exceptions: ExceptionListItemSchema[] =
      listId === ENDPOINT_LIST_ID ? allExceptionsByListId : allExceptionsByListId.filter(filter);

    return convertExceptionsToEndpointFormat(exceptions, schemaVersion);
  }

  /**
   * Builds an artifact (one per supported OS) based on the current state of the
   * artifacts list (Trusted Apps, Host Iso. Exceptions, Event Filters, Blocklists)
   * (which uses the `exception-list-agnostic` SO type)
   */
  protected async buildArtifactsForOs({
    listId,
    name,
    os,
    policyId,
  }: {
    os: string;
    policyId?: string;
  } & BuildArtifactsForOsOptions): Promise<InternalArtifactCompleteSchema> {
    return buildArtifact(
      await this.getCachedExceptions({
        elClient: this.exceptionListClient,
        schemaVersion: this.schemaVersion,
        os,
        policyId,
        listId,
      }),
      this.schemaVersion,
      os,
      name
    );
  }

  /**
   * Builds an artifact (by policy) based on the current state of the
   * artifacts list (Trusted Apps, Host Iso. Exceptions, Event Filters, Blocklists)
   * (which uses the `exception-list-agnostic` SO type)
   */
  protected async buildArtifactsByPolicy(
    allPolicyIds: string[],
    supportedOSs: string[],
    osOptions: BuildArtifactsForOsOptions
  ): Promise<Record<string, InternalArtifactCompleteSchema[]>> {
    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> = {};
    for (const policyId of allPolicyIds)
      for (const os of supportedOSs) {
        policySpecificArtifacts[policyId] = policySpecificArtifacts[policyId] || [];
        policySpecificArtifacts[policyId].push(
          await this.buildArtifactsForOs({ os, policyId, ...osOptions })
        );
      }

    return policySpecificArtifacts;
  }

  /**
   * Builds an array of artifacts (one per supported OS) based on the current
   * state of exception-list-agnostic SOs.
   *
   * @returns {Promise<InternalArtifactCompleteSchema[]>} An array of uncompressed artifacts built from exception-list-agnostic SOs.
   * @throws Throws/rejects if there are errors building the list.
   */
  protected async buildExceptionListArtifacts(
    allPolicyIds: string[]
  ): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> = {};
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_LIST_ID,
      name: ArtifactConstants.GLOBAL_ALLOWLIST_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    allPolicyIds.forEach((policyId) => {
      policySpecificArtifacts[policyId] = defaultArtifacts;
    });

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of artifacts (one per supported OS) based on the current state of the
   * Trusted Apps list (which uses the `exception-list-agnostic` SO type)
   */
  protected async buildTrustedAppsArtifacts(allPolicyIds: string[]): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
      name: ArtifactConstants.GLOBAL_TRUSTED_APPS_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_TRUSTED_APPS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> =
      await this.buildArtifactsByPolicy(
        allPolicyIds,
        ArtifactConstants.SUPPORTED_TRUSTED_APPS_OPERATING_SYSTEMS,
        buildArtifactsForOsOptions
      );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of endpoint event filters (one per supported OS) based on the current state of the
   * Event Filters list
   * @protected
   */
  protected async buildEventFiltersArtifacts(
    allPolicyIds: string[]
  ): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_EVENT_FILTERS_LIST_ID,
      name: ArtifactConstants.GLOBAL_EVENT_FILTERS_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_EVENT_FILTERS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> =
      await this.buildArtifactsByPolicy(
        allPolicyIds,
        ArtifactConstants.SUPPORTED_EVENT_FILTERS_OPERATING_SYSTEMS,
        buildArtifactsForOsOptions
      );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of Blocklist entries (one per supported OS) based on the current state of the
   * Blocklist list
   * @protected
   */
  protected async buildBlocklistArtifacts(allPolicyIds: string[]): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_BLOCKLISTS_LIST_ID,
      name: ArtifactConstants.GLOBAL_BLOCKLISTS_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_BLOCKLISTS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> =
      await this.buildArtifactsByPolicy(
        allPolicyIds,
        ArtifactConstants.SUPPORTED_BLOCKLISTS_OPERATING_SYSTEMS,
        buildArtifactsForOsOptions
      );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of endpoint host isolation exception (one per supported OS) based on the current state of the
   * Host Isolation Exception List
   * @returns
   */

  protected async buildHostIsolationExceptionsArtifacts(
    allPolicyIds: string[]
  ): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
      name: ArtifactConstants.GLOBAL_HOST_ISOLATION_EXCEPTIONS_NAME,
    };

    for (const os of ArtifactConstants.SUPPORTED_HOST_ISOLATION_EXCEPTIONS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildArtifactsForOs({ os, ...buildArtifactsForOsOptions }));
    }

    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> =
      await this.buildArtifactsByPolicy(
        allPolicyIds,
        ArtifactConstants.SUPPORTED_HOST_ISOLATION_EXCEPTIONS_OPERATING_SYSTEMS,
        buildArtifactsForOsOptions
      );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Writes new artifact SOs.
   *
   * @param artifacts An InternalArtifactCompleteSchema array representing the artifacts.
   * @param newManifest A Manifest representing the new manifest
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async pushArtifacts(
    artifacts: InternalArtifactCompleteSchema[],
    newManifest: Manifest
  ): Promise<Error[]> {
    const errors: Error[] = [];

    const artifactsToCreate: InternalArtifactCompleteSchema[] = [];

    for (const artifact of artifacts) {
      if (internalArtifactCompleteSchema.is(artifact)) {
        artifactsToCreate.push(artifact);
      } else {
        errors.push(new EndpointError(`Incomplete artifact: ${getArtifactId(artifact)}`, artifact));
      }
    }

    if (artifactsToCreate.length === 0) {
      return errors;
    }

    const { artifacts: fleetArtifacts, errors: createErrors } =
      await this.artifactClient.bulkCreateArtifacts(artifactsToCreate);

    if (createErrors) {
      errors.push(...createErrors);
    }

    if (fleetArtifacts) {
      const fleetArtfactsByIdentifier: { [key: string]: InternalArtifactCompleteSchema } = {};
      fleetArtifacts.forEach((fleetArtifact) => {
        fleetArtfactsByIdentifier[getArtifactId(fleetArtifact)] = fleetArtifact;
      });
      artifactsToCreate.forEach((artifact) => {
        const artifactId = getArtifactId(artifact);
        const fleetArtifact = fleetArtfactsByIdentifier[artifactId];

        if (!fleetArtifact) return;
        newManifest.replaceArtifact(fleetArtifact);
        this.logger.debug(`New created artifact ${artifactId} added to the manifest`);
      });
    }

    return errors;
  }

  /**
   * Deletes outdated artifact SOs.
   *
   * @param artifactIds The IDs of the artifact to delete..
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async deleteArtifacts(artifactIds: string[]): Promise<Error[]> {
    try {
      if (isEmpty(artifactIds)) {
        return [];
      }
      const errors = await this.artifactClient.bulkDeleteArtifacts(artifactIds);
      if (!isEmpty(errors)) {
        return errors;
      }
      for (const artifactId of artifactIds) {
        this.logger.info(`Cleaned up artifact ${artifactId}`);
      }
      return [];
    } catch (err) {
      return [err];
    }
  }

  /**
   * Returns the last computed manifest based on the state of the user-artifact-manifest SO. If no
   * artifacts have been created yet (ex. no Endpoint policies are in use), then method return `null`
   *
   * @returns {Promise<Manifest | null>} The last computed manifest, or null if does not exist.
   * @throws Throws/rejects if there is an unexpected error retrieving the manifest.
   */
  public async getLastComputedManifest(): Promise<Manifest | null> {
    try {
      const manifestSo = await this.getManifestClient().getManifest();

      if (manifestSo.version === undefined) {
        throw new InvalidInternalManifestError(
          'Internal Manifest map SavedObject is missing version',
          manifestSo
        );
      }

      const manifest = new Manifest({
        schemaVersion: this.schemaVersion,
        semanticVersion: manifestSo.attributes.semanticVersion,
        soVersion: manifestSo.version,
      });

      const fleetArtifacts = await this.listAllArtifacts();
      const fleetArtifactsById = keyBy(fleetArtifacts, (artifact) => getArtifactId(artifact));

      for (const entry of manifestSo.attributes.artifacts) {
        const artifact = fleetArtifactsById[entry.artifactId];

        if (!artifact) {
          this.logger.error(
            new InvalidInternalManifestError(`artifact id [${entry.artifactId}] not found!`, {
              entry,
              action: 'removed from internal ManifestManger tracking map',
            })
          );
        } else {
          manifest.addEntry(artifact, entry.policyId);
        }
      }

      return manifest;
    } catch (error) {
      if (!error.output || error.output.statusCode !== 404) {
        throw wrapErrorIfNeeded(error);
      }
      return null;
    }
  }

  /**
   * creates a new default Manifest
   */
  public static createDefaultManifest(schemaVersion?: ManifestSchemaVersion): Manifest {
    return Manifest.getDefault(schemaVersion);
  }

  /**
   * Builds a new manifest based on the current user exception list.
   *
   * @param baselineManifest A baseline manifest to use for initializing pre-existing artifacts.
   * @returns {Promise<Manifest>} A new Manifest object representing the current exception list.
   */
  public async buildNewManifest(
    baselineManifest: Manifest = ManifestManager.createDefaultManifest(this.schemaVersion)
  ): Promise<Manifest> {
    const allPolicyIds = await this.listEndpointPolicyIds();
    const results = await Promise.all([
      this.buildExceptionListArtifacts(allPolicyIds),
      this.buildTrustedAppsArtifacts(allPolicyIds),
      this.buildEventFiltersArtifacts(allPolicyIds),
      this.buildHostIsolationExceptionsArtifacts(allPolicyIds),
      this.buildBlocklistArtifacts(allPolicyIds),
    ]);

    // Clear cache as the ManifestManager instance is reused on every run.
    this.cachedExceptionsListsByOs.clear();

    const manifest = new Manifest({
      schemaVersion: this.schemaVersion,
      semanticVersion: baselineManifest.getSemanticVersion(),
      soVersion: baselineManifest.getSavedObjectVersion(),
    });

    for (const result of results) {
      iterateArtifactsBuildResult(result, (artifact, policyId) => {
        const artifactToAdd = baselineManifest.getArtifact(getArtifactId(artifact)) || artifact;
        if (!internalArtifactCompleteSchema.is(artifactToAdd)) {
          throw new EndpointError(
            `Incomplete artifact detected: ${getArtifactId(artifactToAdd)}`,
            artifactToAdd
          );
        }

        manifest.addEntry(artifactToAdd, policyId);
      });
    }

    return manifest;
  }

  /**
   * Dispatches the manifest by writing it to the endpoint package policy, if different
   * from the manifest already in the config.
   *
   * @param manifest The Manifest to dispatch.
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async tryDispatch(manifest: Manifest): Promise<Error[]> {
    const allPackagePolicies: PackagePolicy[] = [];
    await iterateAllListItems(
      (page, perPage) => this.listEndpointPolicies(page, perPage),
      (packagePoliciesBatch) => {
        allPackagePolicies.push(...packagePoliciesBatch);
      }
    );

    const packagePoliciesToUpdate: PackagePolicy[] = [];

    const errors: Error[] = [];
    allPackagePolicies.forEach((packagePolicy) => {
      const { id } = packagePolicy;
      if (packagePolicy.inputs.length > 0 && packagePolicy.inputs[0].config !== undefined) {
        const oldManifest = packagePolicy.inputs[0].config.artifact_manifest ?? {
          value: {},
        };

        const newManifestVersion = manifest.getSemanticVersion();
        if (semver.gt(newManifestVersion, oldManifest.value.manifest_version)) {
          const serializedManifest = manifest.toPackagePolicyManifest(id);

          if (!manifestDispatchSchema.is(serializedManifest)) {
            errors.push(new EndpointError(`Invalid manifest for policy ${id}`, serializedManifest));
          } else if (!manifestsEqual(serializedManifest, oldManifest.value)) {
            packagePolicy.inputs[0].config.artifact_manifest = { value: serializedManifest };
            packagePoliciesToUpdate.push(packagePolicy);
          } else {
            this.logger.debug(
              `No change in manifest content for package policy: ${id}. Staying on old version`
            );
          }
        } else {
          this.logger.debug(`No change in manifest version for package policy: ${id}`);
        }
      } else {
        errors.push(
          new EndpointError(`Package Policy ${id} has no 'inputs[0].config'`, packagePolicy)
        );
      }
    });

    // Split updates in batches with batch size: packagerTaskPackagePolicyUpdateBatchSize
    const updateBatches = chunk(
      packagePoliciesToUpdate,
      this.packagerTaskPackagePolicyUpdateBatchSize
    );

    for (const currentBatch of updateBatches) {
      const response = await this.packagePolicyService.bulkUpdate(
        this.savedObjectsClient,
        this.esClient,
        currentBatch
      );

      // Update errors
      if (!isEmpty(response.failedPolicies)) {
        errors.push(
          ...response.failedPolicies.map((failedPolicy) => {
            if (failedPolicy.error instanceof Error) {
              return failedPolicy.error;
            } else {
              return new Error(failedPolicy.error.message);
            }
          })
        );
      }
      // Log success updates
      for (const updatedPolicy of response.updatedPolicies || []) {
        this.logger.debug(
          `Updated package policy ${
            updatedPolicy.id
          } with manifest version ${manifest.getSemanticVersion()}`
        );
      }
    }

    return errors;
  }

  /**
   * Commits a manifest to indicate that a new version has been computed.
   *
   * @param manifest The Manifest to commit.
   * @returns {Promise<Error | null>} An error, if encountered, or null.
   */
  public async commit(manifest: Manifest) {
    const manifestClient = this.getManifestClient();

    // Commit the new manifest
    const manifestSo = manifest.toSavedObject();
    const version = manifest.getSavedObjectVersion();

    if (version == null) {
      await manifestClient.createManifest(manifestSo);
    } else {
      await manifestClient.updateManifest(manifestSo, {
        version,
      });
    }

    this.logger.info(`Committed manifest ${manifest.getSemanticVersion()}`);
  }

  private async listEndpointPolicies(
    page: number,
    perPage: number
  ): Promise<ListResult<PackagePolicy>> {
    return this.packagePolicyService.list(this.savedObjectsClient, {
      page,
      perPage,
      kuery: 'ingest-package-policies.package.name:endpoint',
    });
  }

  private async listEndpointPolicyIds(): Promise<string[]> {
    const allPolicyIds: string[] = [];
    await iterateAllListItems(
      (page, perPage) => {
        return this.packagePolicyService.listIds(this.savedObjectsClient, {
          page,
          perPage,
          kuery: 'ingest-package-policies.package.name:endpoint',
        });
      },
      (packagePolicyIdsBatch) => {
        allPolicyIds.push(...packagePolicyIdsBatch);
      }
    );
    return allPolicyIds;
  }

  public getArtifactsClient(): EndpointArtifactClientInterface {
    return this.artifactClient;
  }

  /**
   * Retrieves all .fleet-artifacts for endpoint package
   * @returns Artifact[]
   */
  private async listAllArtifacts(): Promise<Artifact[]> {
    const fleetArtifacts = [];
    const perPage = 100;
    let page = 1;

    let fleetArtifactsResponse = await this.artifactClient.listArtifacts({
      perPage,
      page,
    });
    fleetArtifacts.push(...fleetArtifactsResponse.items);

    while (
      fleetArtifactsResponse.total > fleetArtifacts.length &&
      !isEmpty(fleetArtifactsResponse.items)
    ) {
      page += 1;
      fleetArtifactsResponse = await this.artifactClient.listArtifacts({
        perPage,
        page,
      });
      fleetArtifacts.push(...fleetArtifactsResponse.items);
    }
    return fleetArtifacts;
  }

  /**
   * Cleanup .fleet-artifacts index if there are some orphan artifacts
   */
  public async cleanup(manifest: Manifest) {
    try {
      const fleetArtifacts = await this.listAllArtifacts();
      if (isEmpty(fleetArtifacts)) {
        return;
      }

      const badArtifacts = [];
      const badArtifactIds = [];

      const manifestArtifactsIds = manifest
        .getAllArtifacts()
        .map((artifact) => getArtifactId(artifact));

      for (const fleetArtifact of fleetArtifacts) {
        const artifactId = getArtifactId(fleetArtifact);
        const isArtifactInManifest = manifestArtifactsIds.includes(artifactId);

        if (!isArtifactInManifest) {
          badArtifacts.push(fleetArtifact);
          badArtifactIds.push(artifactId);
        }
      }

      if (isEmpty(badArtifacts)) {
        return;
      }

      this.logger.error(
        new EndpointError(`Cleaning up ${badArtifacts.length} orphan artifacts`, badArtifacts)
      );

      await this.artifactClient.bulkDeleteArtifacts(badArtifactIds);

      this.logger.info(`All orphan artifacts has been removed successfully`);
    } catch (error) {
      this.logger.error(new EndpointError('There was an error cleaning orphan artifacts', error));
    }
  }
}
