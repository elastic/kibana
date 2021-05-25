/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import LRU from 'lru-cache';
import { isEqual } from 'lodash';
import { Logger, SavedObjectsClientContract } from 'src/core/server';
import { ListResult } from '../../../../../../fleet/common';
import { PackagePolicyServiceInterface } from '../../../../../../fleet/server';
import { ExceptionListClient } from '../../../../../../lists/server';
import { ManifestSchemaVersion } from '../../../../../common/endpoint/schema/common';
import {
  manifestDispatchSchema,
  ManifestSchema,
} from '../../../../../common/endpoint/schema/manifest';

import {
  ArtifactConstants,
  buildArtifact,
  getArtifactId,
  getEndpointEventFiltersList,
  getEndpointExceptionList,
  getEndpointTrustedAppsList,
  isCompressed,
  Manifest,
  maybeCompressArtifact,
} from '../../../lib/artifacts';
import {
  InternalArtifactCompleteSchema,
  internalArtifactCompleteSchema,
} from '../../../schemas/artifacts';
import { EndpointArtifactClientInterface } from '../artifact_client';
import { ManifestClient } from '../manifest_client';
import { ExperimentalFeatures } from '../../../../../common/experimental_features';

interface ArtifactsBuildResult {
  defaultArtifacts: InternalArtifactCompleteSchema[];
  policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]>;
}

const iterateArtifactsBuildResult = async (
  result: ArtifactsBuildResult,
  callback: (artifact: InternalArtifactCompleteSchema, policyId?: string) => Promise<void>
) => {
  for (const artifact of result.defaultArtifacts) {
    await callback(artifact);
  }

  for (const policyId of Object.keys(result.policySpecificArtifacts)) {
    for (const artifact of result.policySpecificArtifacts[policyId]) {
      await callback(artifact, policyId);
    }
  }
};

const iterateAllListItems = async <T>(
  pageSupplier: (page: number) => Promise<ListResult<T>>,
  itemCallback: (item: T) => void
) => {
  let paging = true;
  let page = 1;

  while (paging) {
    const { items, total } = await pageSupplier(page);

    for (const item of items) {
      await itemCallback(item);
    }

    paging = (page - 1) * 20 + items.length < total;
    page++;
  }
};

export interface ManifestManagerContext {
  savedObjectsClient: SavedObjectsClientContract;
  artifactClient: EndpointArtifactClientInterface;
  exceptionListClient: ExceptionListClient;
  packagePolicyService: PackagePolicyServiceInterface;
  logger: Logger;
  cache: LRU<string, Buffer>;
  experimentalFeatures: ExperimentalFeatures;
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
  protected packagePolicyService: PackagePolicyServiceInterface;
  protected savedObjectsClient: SavedObjectsClientContract;
  protected logger: Logger;
  protected cache: LRU<string, Buffer>;
  protected schemaVersion: ManifestSchemaVersion;
  protected experimentalFeatures: ExperimentalFeatures;

  constructor(context: ManifestManagerContext) {
    this.artifactClient = context.artifactClient;
    this.exceptionListClient = context.exceptionListClient;
    this.packagePolicyService = context.packagePolicyService;
    this.savedObjectsClient = context.savedObjectsClient;
    this.logger = context.logger;
    this.cache = context.cache;
    this.schemaVersion = 'v1';
    this.experimentalFeatures = context.experimentalFeatures;
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
   * Builds an artifact (one per supported OS) based on the current
   * state of exception-list-agnostic SOs.
   */
  protected async buildExceptionListArtifact(os: string): Promise<InternalArtifactCompleteSchema> {
    return buildArtifact(
      await getEndpointExceptionList(this.exceptionListClient, this.schemaVersion, os),
      this.schemaVersion,
      os,
      ArtifactConstants.GLOBAL_ALLOWLIST_NAME
    );
  }

  /**
   * Builds an array of artifacts (one per supported OS) based on the current
   * state of exception-list-agnostic SOs.
   *
   * @returns {Promise<InternalArtifactCompleteSchema[]>} An array of uncompressed artifacts built from exception-list-agnostic SOs.
   * @throws Throws/rejects if there are errors building the list.
   */
  protected async buildExceptionListArtifacts(): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> = {};

    for (const os of ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildExceptionListArtifact(os));
    }

    await iterateAllListItems(
      (page) => this.listEndpointPolicyIds(page),
      async (policyId) => {
        policySpecificArtifacts[policyId] = defaultArtifacts;
      }
    );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an artifact (one per supported OS) based on the current state of the
   * Trusted Apps list (which uses the `exception-list-agnostic` SO type)
   */
  protected async buildTrustedAppsArtifact(os: string, policyId?: string) {
    return buildArtifact(
      await getEndpointTrustedAppsList(this.exceptionListClient, this.schemaVersion, os, policyId),
      this.schemaVersion,
      os,
      ArtifactConstants.GLOBAL_TRUSTED_APPS_NAME
    );
  }

  /**
   * Builds an array of artifacts (one per supported OS) based on the current state of the
   * Trusted Apps list (which uses the `exception-list-agnostic` SO type)
   */
  protected async buildTrustedAppsArtifacts(): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> = {};

    for (const os of ArtifactConstants.SUPPORTED_TRUSTED_APPS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildTrustedAppsArtifact(os));
    }

    await iterateAllListItems(
      (page) => this.listEndpointPolicyIds(page),
      async (policyId) => {
        for (const os of ArtifactConstants.SUPPORTED_TRUSTED_APPS_OPERATING_SYSTEMS) {
          policySpecificArtifacts[policyId] = policySpecificArtifacts[policyId] || [];
          policySpecificArtifacts[policyId].push(await this.buildTrustedAppsArtifact(os, policyId));
        }
      }
    );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  /**
   * Builds an array of endpoint event filters (one per supported OS) based on the current state of the
   * Event Filters list
   * @protected
   */
  protected async buildEventFiltersArtifacts(): Promise<ArtifactsBuildResult> {
    const defaultArtifacts: InternalArtifactCompleteSchema[] = [];
    const policySpecificArtifacts: Record<string, InternalArtifactCompleteSchema[]> = {};

    for (const os of ArtifactConstants.SUPPORTED_EVENT_FILTERS_OPERATING_SYSTEMS) {
      defaultArtifacts.push(await this.buildEventFiltersForOs(os));
    }

    await iterateAllListItems(
      (page) => this.listEndpointPolicyIds(page),
      async (policyId) => {
        for (const os of ArtifactConstants.SUPPORTED_EVENT_FILTERS_OPERATING_SYSTEMS) {
          policySpecificArtifacts[policyId] = policySpecificArtifacts[policyId] || [];
          policySpecificArtifacts[policyId].push(await this.buildEventFiltersForOs(os, policyId));
        }
      }
    );

    return { defaultArtifacts, policySpecificArtifacts };
  }

  protected async buildEventFiltersForOs(os: string, policyId?: string) {
    return buildArtifact(
      await getEndpointEventFiltersList(this.exceptionListClient, this.schemaVersion, os, policyId),
      this.schemaVersion,
      os,
      ArtifactConstants.GLOBAL_EVENT_FILTERS_NAME
    );
  }

  /**
   * Writes new artifact SO.
   *
   * @param artifact An InternalArtifactCompleteSchema representing the artifact.
   * @returns {Promise<Error | null>} An error, if encountered, or null.
   */
  protected async pushArtifact(artifact: InternalArtifactCompleteSchema): Promise<Error | null> {
    const artifactId = getArtifactId(artifact);
    try {
      // Write the artifact SO
      await this.artifactClient.createArtifact(artifact);

      // Cache the compressed body of the artifact
      this.cache.set(artifactId, Buffer.from(artifact.body, 'base64'));
    } catch (err) {
      if (this.savedObjectsClient.errors.isConflictError(err)) {
        this.logger.debug(`Tried to create artifact ${artifactId}, but it already exists.`);
      } else {
        return err;
      }
    }

    return null;
  }

  /**
   * Writes new artifact SOs.
   *
   * @param artifacts An InternalArtifactCompleteSchema array representing the artifacts.
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async pushArtifacts(artifacts: InternalArtifactCompleteSchema[]): Promise<Error[]> {
    const errors: Error[] = [];
    for (const artifact of artifacts) {
      if (internalArtifactCompleteSchema.is(artifact)) {
        const err = await this.pushArtifact(artifact);
        if (err) {
          errors.push(err);
        }
      } else {
        errors.push(new Error(`Incomplete artifact: ${getArtifactId(artifact)}`));
      }
    }
    return errors;
  }

  /**
   * Deletes outdated artifact SOs.
   *
   * The artifact may still remain in the cache.
   *
   * @param artifactIds The IDs of the artifact to delete..
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async deleteArtifacts(artifactIds: string[]): Promise<Error[]> {
    const errors: Error[] = [];
    for (const artifactId of artifactIds) {
      try {
        await this.artifactClient.deleteArtifact(artifactId);
        this.logger.info(`Cleaned up artifact ${artifactId}`);
      } catch (err) {
        errors.push(err);
      }
    }
    return errors;
  }

  /**
   * Returns the last computed manifest based on the state of the
   * user-artifact-manifest SO.
   *
   * @returns {Promise<Manifest | null>} The last computed manifest, or null if does not exist.
   * @throws Throws/rejects if there is an unexpected error retrieving the manifest.
   */
  public async getLastComputedManifest(): Promise<Manifest | null> {
    try {
      const manifestSo = await this.getManifestClient().getManifest();

      if (manifestSo.version === undefined) {
        throw new Error('No version returned for manifest.');
      }

      const manifest = new Manifest({
        schemaVersion: this.schemaVersion,
        semanticVersion: manifestSo.attributes.semanticVersion,
        soVersion: manifestSo.version,
      });

      for (const entry of manifestSo.attributes.artifacts) {
        const artifact = await this.artifactClient.getArtifact(entry.artifactId);

        if (!artifact) {
          throw new Error(`artifact id [${entry.artifactId}] not found!`);
        }

        manifest.addEntry(artifact, entry.policyId);
      }

      return manifest;
    } catch (error) {
      if (!error.output || error.output.statusCode !== 404) {
        throw error;
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
   * @returns {Promise<Manifest>} A new Manifest object reprenting the current exception list.
   */
  public async buildNewManifest(
    baselineManifest: Manifest = ManifestManager.createDefaultManifest(this.schemaVersion)
  ): Promise<Manifest> {
    const results = await Promise.all([
      this.buildExceptionListArtifacts(),
      this.buildTrustedAppsArtifacts(),
      this.buildEventFiltersArtifacts(),
    ]);

    const manifest = new Manifest({
      schemaVersion: this.schemaVersion,
      semanticVersion: baselineManifest.getSemanticVersion(),
      soVersion: baselineManifest.getSavedObjectVersion(),
    });

    for (const result of results) {
      await iterateArtifactsBuildResult(result, async (artifact, policyId) => {
        let artifactToAdd = baselineManifest.getArtifact(getArtifactId(artifact)) || artifact;

        if (!isCompressed(artifactToAdd)) {
          artifactToAdd = await maybeCompressArtifact(artifactToAdd);

          if (!isCompressed(artifactToAdd)) {
            throw new Error(`Unable to compress artifact: ${getArtifactId(artifactToAdd)}`);
          } else if (!internalArtifactCompleteSchema.is(artifactToAdd)) {
            throw new Error(`Incomplete artifact detected: ${getArtifactId(artifactToAdd)}`);
          }
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

    await iterateAllListItems(
      (page) => this.listEndpointPolicies(page),
      async (packagePolicy) => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, revision, updated_at, updated_by, ...newPackagePolicy } = packagePolicy;
        if (newPackagePolicy.inputs.length > 0 && newPackagePolicy.inputs[0].config !== undefined) {
          const oldManifest = newPackagePolicy.inputs[0].config.artifact_manifest ?? {
            value: {},
          };

          const newManifestVersion = manifest.getSemanticVersion();
          if (semver.gt(newManifestVersion, oldManifest.value.manifest_version)) {
            const serializedManifest = manifest.toPackagePolicyManifest(packagePolicy.id);

            if (!manifestDispatchSchema.is(serializedManifest)) {
              errors.push(new Error(`Invalid manifest for policy ${packagePolicy.id}`));
            } else if (!manifestsEqual(serializedManifest, oldManifest.value)) {
              newPackagePolicy.inputs[0].config.artifact_manifest = { value: serializedManifest };

              try {
                await this.packagePolicyService.update(
                  this.savedObjectsClient,
                  // @ts-ignore
                  undefined,
                  id,
                  newPackagePolicy
                );
                this.logger.debug(
                  `Updated package policy ${id} with manifest version ${manifest.getSemanticVersion()}`
                );
              } catch (err) {
                errors.push(err);
              }
            } else {
              this.logger.debug(
                `No change in manifest content for package policy: ${id}. Staying on old version`
              );
            }
          } else {
            this.logger.debug(`No change in manifest version for package policy: ${id}`);
          }
        } else {
          errors.push(new Error(`Package Policy ${id} has no config.`));
        }
      }
    );

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

  private async listEndpointPolicies(page: number) {
    return this.packagePolicyService.list(this.savedObjectsClient, {
      page,
      perPage: 20,
      kuery: 'ingest-package-policies.package.name:endpoint',
    });
  }

  private async listEndpointPolicyIds(page: number) {
    return this.packagePolicyService.listIds(this.savedObjectsClient, {
      page,
      perPage: 20,
      kuery: 'ingest-package-policies.package.name:endpoint',
    });
  }

  public getArtifactsClient(): EndpointArtifactClientInterface {
    return this.artifactClient;
  }
}
