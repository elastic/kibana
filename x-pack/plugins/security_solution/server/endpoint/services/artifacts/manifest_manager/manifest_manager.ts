/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import { isEmpty, isEqual, keyBy } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type Logger, type SavedObjectsClientContract } from '@kbn/core/server';
import { ENDPOINT_LIST_ID, ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Artifact, PackagePolicyClient } from '@kbn/fleet-plugin/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { AppFeatureKey } from '@kbn/security-solution-features/keys';
import { stringify } from '../../../utils/stringify';
import { BatchProcessor } from '../../../utils/batch_processor';
import type { AppFeaturesService } from '../../../../lib/app_features_service/app_features_service';
import type { ExperimentalFeatures } from '../../../../../common';
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
  exceptionItemDecorator?: (item: ExceptionListItemSchema) => ExceptionListItemSchema;
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

export interface ManifestManagerContext {
  savedObjectsClient: SavedObjectsClientContract;
  artifactClient: EndpointArtifactClientInterface;
  exceptionListClient: ExceptionListClient;
  packagePolicyService: PackagePolicyClient;
  logger: Logger;
  experimentalFeatures: ExperimentalFeatures;
  packagerTaskPackagePolicyUpdateBatchSize: number;
  esClient: ElasticsearchClient;
  appFeaturesService: AppFeaturesService;
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
  protected appFeaturesService: AppFeaturesService;

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
    this.appFeaturesService = context.appFeaturesService;
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
    exceptionItemDecorator,
  }: {
    elClient: ExceptionListClient;
    listId: ArtifactListId;
    os: string;
    policyId?: string;
    schemaVersion: string;
    exceptionItemDecorator?: (item: ExceptionListItemSchema) => ExceptionListItemSchema;
  }): Promise<WrappedTranslatedExceptionList> {
    if (!this.cachedExceptionsListsByOs.has(`${listId}-${os}`)) {
      let itemsByListId: ExceptionListItemSchema[] = [];
      if (
        (listId === ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id &&
          this.appFeaturesService.isEnabled(AppFeatureKey.endpointResponseActions)) ||
        (listId !== ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id &&
          this.appFeaturesService.isEnabled(AppFeatureKey.endpointArtifactManagement))
      ) {
        itemsByListId = await getAllItemsFromEndpointExceptionList({
          elClient,
          os,
          listId,
        });

        if (exceptionItemDecorator) {
          itemsByListId = itemsByListId.map(exceptionItemDecorator);
        }
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
    exceptionItemDecorator,
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
        exceptionItemDecorator,
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

    const decorateWildcardOnlyExceptionItem = (item: ExceptionListItemSchema) => {
      const isWildcardOnly = item.entries.every(({ type }) => type === 'wildcard');

      // add `event.module=endpoint` to make endpoints older than 8.2 work when only `wildcard` is used
      if (isWildcardOnly) {
        item.entries.push({
          type: 'match',
          operator: 'included',
          field: 'event.module',
          value: 'endpoint',
        });
      }

      return item;
    };

    const buildArtifactsForOsOptions: BuildArtifactsForOsOptions = {
      listId: ENDPOINT_LIST_ID,
      name: ArtifactConstants.GLOBAL_ALLOWLIST_NAME,
      exceptionItemDecorator: decorateWildcardOnlyExceptionItem,
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
      listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
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
      listId: ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
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
      listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
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
      listId: ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
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

      this.logger.info(`Cleaned up artifacts:\n  ${artifactIds.join('\n  ')}`);

      return [];
    } catch (err) {
      this.logger.debug(
        `Attempted to delete [${artifactIds.length}] outdated artifacts failed with: ${err.message}`
      );
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
    const errors: Error[] = [];
    const updatedPolicies: string[] = [];
    const unChangedPolicies: string[] = [];
    const manifestVersion = manifest.getSemanticVersion();
    const policyUpdateBatchProcessor = new BatchProcessor<PackagePolicy>({
      batchSize: this.packagerTaskPackagePolicyUpdateBatchSize,
      logger: this.logger,
      key: 'tryDispatch',
      batchHandler: async ({ data: currentBatch }) => {
        const response = await this.packagePolicyService.bulkUpdate(
          this.savedObjectsClient,
          this.esClient,
          currentBatch
        );

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

        if (response.updatedPolicies) {
          updatedPolicies.push(
            ...response.updatedPolicies.map((policy) => {
              return `[${policy.id}][${policy.name}] updated with manifest version: [${manifestVersion}]`;
            })
          );
        }
      },
    });

    for await (const policies of this.fetchAllPolicies()) {
      for (const packagePolicy of policies) {
        const { id, name } = packagePolicy;

        if (packagePolicy.inputs.length > 0 && packagePolicy.inputs[0].config !== undefined) {
          const oldManifest = packagePolicy.inputs[0].config.artifact_manifest ?? {
            value: {},
          };

          const newManifestVersion = manifest.getSemanticVersion();

          if (semver.gt(newManifestVersion, oldManifest.value.manifest_version)) {
            const serializedManifest = manifest.toPackagePolicyManifest(id);

            if (!manifestDispatchSchema.is(serializedManifest)) {
              errors.push(
                new EndpointError(`Invalid manifest for policy ${id}`, serializedManifest)
              );
            } else if (!manifestsEqual(serializedManifest, oldManifest.value)) {
              packagePolicy.inputs[0].config.artifact_manifest = { value: serializedManifest };
              policyUpdateBatchProcessor.addToQueue(packagePolicy);
            } else {
              unChangedPolicies.push(`[${id}][${name}] No change in manifest content`);
            }
          } else {
            unChangedPolicies.push(`[${id}][${name}] No change in manifest version`);
          }
        } else {
          errors.push(
            new EndpointError(`Package Policy ${id} has no 'inputs[0].config'`, packagePolicy)
          );
        }
      }
    }

    await policyUpdateBatchProcessor.complete();

    this.logger.info(`Policies updated: [${updatedPolicies.length}]`);

    if (updatedPolicies.length) {
      this.logger.debug(`  ${updatedPolicies.join('\n  ')}`);
    }

    this.logger.info(`Policies un-changed: [${unChangedPolicies.length}]`);

    if (unChangedPolicies.length) {
      this.logger.debug(`  ${unChangedPolicies.join('\n  ')}`);
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

  private fetchAllPolicies(): AsyncIterable<PackagePolicy[]> {
    return this.packagePolicyService.fetchAllItems(this.savedObjectsClient, {
      kuery: 'ingest-package-policies.package.name:endpoint',
    });
  }

  private async listEndpointPolicyIds(): Promise<string[]> {
    const allPolicyIds: string[] = [];

    for await (const itemIds of this.packagePolicyService.fetchAllItemIds(this.savedObjectsClient, {
      kuery: 'ingest-package-policies.package.name:endpoint',
    })) {
      allPolicyIds.push(...itemIds);
    }

    this.logger.debug(`Retrieved [${allPolicyIds.length}] endpoint integration policy IDs`);

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
    const fleetArtifacts: Artifact[] = [];
    let total = 0;

    for await (const artifacts of this.artifactClient.fetchAll()) {
      fleetArtifacts.push(...artifacts);
      total += artifacts.length;
    }

    this.logger.debug(`Retrieved [${total}] artifacts from fleet`);

    return fleetArtifacts;
  }

  /**
   * Cleanup .fleet-artifacts index if there are some orphan artifacts
   */
  public async cleanup(manifest: Manifest) {
    // TODO:PT change method to instead process only artifact IDs
    //      `getLastComputedManifest()` already loops through all artifacts from Fleet and actually
    //      knows which ones are bad. We should leverage that instead of looping through all of them
    //      here again.

    const badArtifactIds: string[] = [];
    const artifactDeletionProcess = new BatchProcessor<string>({
      batchSize: this.packagerTaskPackagePolicyUpdateBatchSize,
      logger: this.logger,
      key: 'cleanup',
      batchHandler: async ({ batch, data }) => {
        const deleteErrors = await this.artifactClient.bulkDeleteArtifacts(data);

        badArtifactIds.push(...data);

        if (deleteErrors) {
          this.logger.error(
            `Delete batch #[${batch}] with [${
              data.length
            }] items encountered the following errors:\n${stringify(deleteErrors)}`
          );
        }
      },
    });

    const validArtifactIds = manifest.getAllArtifacts().map((artifact) => getArtifactId(artifact));

    for await (const artifacts of this.artifactClient.fetchAll()) {
      for (const artifact of artifacts) {
        const artifactId = getArtifactId(artifact);
        const isArtifactInManifest = validArtifactIds.includes(artifactId);

        if (!isArtifactInManifest) {
          artifactDeletionProcess.addToQueue(artifactId);
        }
      }
    }

    await artifactDeletionProcess.complete();

    this.logger.info(`Orphan artifacts (if any) have been cleaned up`);

    if (badArtifactIds.length) {
      this.logger.debug(`Deleted artifacts from Fleet:\n${stringify(badArtifactIds)}`);
    }
  }
}
