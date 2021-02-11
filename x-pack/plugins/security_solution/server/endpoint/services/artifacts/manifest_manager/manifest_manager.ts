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
  getFullEndpointExceptionList,
  isCompressed,
  Manifest,
  maybeCompressArtifact,
} from '../../../lib/artifacts';
import {
  InternalArtifactCompleteSchema,
  internalArtifactCompleteSchema,
} from '../../../schemas/artifacts';
import { ArtifactClient } from '../artifact_client';
import { ManifestClient } from '../manifest_client';
import { ENDPOINT_LIST_ID } from '../../../../../../lists/common';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../../../lists/common/constants';
import { PackagePolicy } from '../../../../../../fleet/common/types/models';

export interface ManifestManagerContext {
  savedObjectsClient: SavedObjectsClientContract;
  artifactClient: ArtifactClient;
  exceptionListClient: ExceptionListClient;
  packagePolicyService: PackagePolicyServiceInterface;
  logger: Logger;
  cache: LRU<string, Buffer>;
}

const getArtifactIds = (manifest: ManifestSchema) =>
  [...Object.keys(manifest.artifacts)].map(
    (key) => `${key}-${manifest.artifacts[key].decoded_sha256}`
  );

const manifestsEqual = (manifest1: ManifestSchema, manifest2: ManifestSchema) =>
  isEqual(new Set(getArtifactIds(manifest1)), new Set(getArtifactIds(manifest2)));

export class ManifestManager {
  protected artifactClient: ArtifactClient;
  protected exceptionListClient: ExceptionListClient;
  protected packagePolicyService: PackagePolicyServiceInterface;
  protected savedObjectsClient: SavedObjectsClientContract;
  protected logger: Logger;
  protected cache: LRU<string, Buffer>;
  protected schemaVersion: ManifestSchemaVersion;

  constructor(context: ManifestManagerContext) {
    this.artifactClient = context.artifactClient;
    this.exceptionListClient = context.exceptionListClient;
    this.packagePolicyService = context.packagePolicyService;
    this.savedObjectsClient = context.savedObjectsClient;
    this.logger = context.logger;
    this.cache = context.cache;
    this.schemaVersion = 'v1';
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
   * Builds an array of artifacts (one per supported OS) based on the current
   * state of exception-list-agnostic SOs.
   *
   * @returns {Promise<InternalArtifactCompleteSchema[]>} An array of uncompressed artifacts built from exception-list-agnostic SOs.
   * @throws Throws/rejects if there are errors building the list.
   */
  protected async buildExceptionListArtifacts(
    artifactSchemaVersion?: string
  ): Promise<InternalArtifactCompleteSchema[]> {
    const artifacts: InternalArtifactCompleteSchema[] = [];
    for (const os of ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS) {
      const exceptionList = await getFullEndpointExceptionList(
        this.exceptionListClient,
        os,
        artifactSchemaVersion ?? 'v1',
        ENDPOINT_LIST_ID
      );
      const artifact = await buildArtifact(
        exceptionList,
        os,
        artifactSchemaVersion ?? 'v1',
        ArtifactConstants.GLOBAL_ALLOWLIST_NAME
      );
      artifacts.push(artifact);
    }
    return artifacts;
  }

  /**
   * Builds an array of artifacts (one per supported OS) based on the current state of the
   * Trusted Apps list (which uses the `exception-list-agnostic` SO type)
   * @param artifactSchemaVersion
   */
  protected async buildTrustedAppsArtifacts(
    artifactSchemaVersion?: string
  ): Promise<InternalArtifactCompleteSchema[]> {
    const artifacts: InternalArtifactCompleteSchema[] = [];

    for (const os of ArtifactConstants.SUPPORTED_TRUSTED_APPS_OPERATING_SYSTEMS) {
      const trustedApps = await getFullEndpointExceptionList(
        this.exceptionListClient,
        os,
        artifactSchemaVersion ?? 'v1',
        ENDPOINT_TRUSTED_APPS_LIST_ID
      );
      const artifact = await buildArtifact(
        trustedApps,
        os,
        'v1',
        ArtifactConstants.GLOBAL_TRUSTED_APPS_NAME
      );
      artifacts.push(artifact);
    }
    return artifacts;
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
        manifest.addEntry(
          (await this.artifactClient.getArtifact(entry.artifactId)).attributes,
          entry.policyId
        );
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
   * Builds a new manifest based on the current user exception list.
   *
   * @param baselineManifest A baseline manifest to use for initializing pre-existing artifacts.
   * @returns {Promise<Manifest>} A new Manifest object reprenting the current exception list.
   */
  public async buildNewManifest(
    baselineManifest: Manifest = Manifest.getDefault(this.schemaVersion)
  ): Promise<Manifest> {
    // Build new exception list artifacts
    const artifacts = (
      await Promise.all([this.buildExceptionListArtifacts(), this.buildTrustedAppsArtifacts()])
    ).flat();

    // Build new manifest
    const manifest = new Manifest({
      schemaVersion: this.schemaVersion,
      semanticVersion: baselineManifest.getSemanticVersion(),
      soVersion: baselineManifest.getSavedObjectVersion(),
    });

    for (const artifact of artifacts) {
      let artifactToAdd = baselineManifest.getArtifact(getArtifactId(artifact)) || artifact;

      if (!isCompressed(artifactToAdd)) {
        artifactToAdd = await maybeCompressArtifact(artifactToAdd);

        if (!isCompressed(artifactToAdd)) {
          throw new Error(`Unable to compress artifact: ${getArtifactId(artifactToAdd)}`);
        } else if (!internalArtifactCompleteSchema.is(artifactToAdd)) {
          throw new Error(`Incomplete artifact detected: ${getArtifactId(artifactToAdd)}`);
        }
      }

      manifest.addEntry(artifactToAdd);
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

    await this.forEachPolicy(async (packagePolicy) => {
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
    });

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

  private async forEachPolicy(callback: (policy: PackagePolicy) => Promise<void>) {
    let paging = true;
    let page = 1;

    while (paging) {
      const { items, total } = await this.packagePolicyService.list(this.savedObjectsClient, {
        page,
        perPage: 20,
        kuery: 'ingest-package-policies.package.name:endpoint',
      });

      for (const packagePolicy of items) {
        await callback(packagePolicy);
      }

      paging = (page - 1) * 20 + items.length < total;
      page++;
    }
  }
}
