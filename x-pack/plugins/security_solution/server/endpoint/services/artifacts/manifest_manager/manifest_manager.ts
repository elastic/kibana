/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObjectsClientContract } from 'src/core/server';
import LRU from 'lru-cache';
import { PackageConfigServiceInterface } from '../../../../../../ingest_manager/server';
import { ExceptionListClient } from '../../../../../../lists/server';
import { ManifestSchemaVersion } from '../../../../../common/endpoint/schema/common';
import { manifestDispatchSchema } from '../../../../../common/endpoint/schema/manifest';

import {
  ArtifactConstants,
  ManifestConstants,
  Manifest,
  buildArtifact,
  getFullEndpointExceptionList,
  ManifestDiff,
  getArtifactId,
} from '../../../lib/artifacts';
import {
  InternalArtifactCompleteSchema,
  internalArtifactCompleteSchema,
} from '../../../schemas/artifacts';
import { ArtifactClient } from '../artifact_client';
import { ManifestClient } from '../manifest_client';

export interface ManifestManagerContext {
  savedObjectsClient: SavedObjectsClientContract;
  artifactClient: ArtifactClient;
  exceptionListClient: ExceptionListClient;
  packageConfigService: PackageConfigServiceInterface;
  logger: Logger;
  cache: LRU<string, Buffer>;
}

export interface ManifestSnapshotOpts {
  initialize?: boolean;
}

export interface ManifestSnapshot {
  manifest: Manifest;
  diffs: ManifestDiff[];
}

export class ManifestManager {
  protected artifactClient: ArtifactClient;
  protected exceptionListClient: ExceptionListClient;
  protected packageConfigService: PackageConfigServiceInterface;
  protected savedObjectsClient: SavedObjectsClientContract;
  protected logger: Logger;
  protected cache: LRU<string, Buffer>;

  constructor(context: ManifestManagerContext) {
    this.artifactClient = context.artifactClient;
    this.exceptionListClient = context.exceptionListClient;
    this.packageConfigService = context.packageConfigService;
    this.savedObjectsClient = context.savedObjectsClient;
    this.logger = context.logger;
    this.cache = context.cache;
  }

  /**
   * Gets a ManifestClient for the provided schemaVersion.
   *
   * @param schemaVersion The schema version of the manifest.
   * @returns {ManifestClient} A ManifestClient scoped to the provided schemaVersion.
   */
  protected getManifestClient(schemaVersion: string): ManifestClient {
    return new ManifestClient(this.savedObjectsClient, schemaVersion as ManifestSchemaVersion);
  }

  /**
   * Builds an array of artifacts (one per supported OS) based on the current
   * state of exception-list-agnostic SOs.
   *
   * @param schemaVersion The schema version of the artifact
   * @returns {Promise<InternalArtifactCompleteSchema[]>} An array of uncompressed artifacts built from exception-list-agnostic SOs.
   * @throws Throws/rejects if there are errors building the list.
   */
  protected async buildExceptionListArtifacts(
    schemaVersion: string
  ): Promise<InternalArtifactCompleteSchema[]> {
    return ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS.reduce<
      Promise<InternalArtifactCompleteSchema[]>
    >(async (acc, os) => {
      const exceptionList = await getFullEndpointExceptionList(
        this.exceptionListClient,
        os,
        schemaVersion
      );
      const artifacts = await acc;
      const artifact = await buildArtifact(exceptionList, os, schemaVersion);
      return Promise.resolve([...artifacts, artifact]);
    }, Promise.resolve([]));
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
   * @param schemaVersion The schema version of the manifest.
   * @returns {Promise<Manifest | null>} The last computed manifest, or null if does not exist.
   * @throws Throws/rejects if there is an unexpected error retrieving the manifest.
   */
  public async getLastComputedManifest(schemaVersion: string): Promise<Manifest | null> {
    try {
      const manifestClient = this.getManifestClient(schemaVersion);
      const manifestSo = await manifestClient.getManifest();

      if (manifestSo.version === undefined) {
        throw new Error('No version returned for manifest.');
      }

      const manifest = new Manifest(schemaVersion, manifestSo.version);

      for (const id of manifestSo.attributes.ids) {
        const artifactSo = await this.artifactClient.getArtifact(id);
        manifest.addEntry(artifactSo.attributes);
      }
      return manifest;
    } catch (err) {
      if (err.output.statusCode !== 404) {
        throw err;
      }
      return null;
    }
  }

  /**
   * Builds a new manifest based on the current user exception list.
   *
   * @param schemaVersion The schema version of the manifest.
   * @param baselineManifest A baseline manifest to use for initializing pre-existing artifacts.
   * @returns {Promise<Manifest>} A new Manifest object reprenting the current exception list.
   */
  public async buildNewManifest(
    schemaVersion: string,
    baselineManifest?: Manifest
  ): Promise<Manifest> {
    // Build new exception list artifacts
    const artifacts = await this.buildExceptionListArtifacts(ArtifactConstants.SCHEMA_VERSION);

    // Build new manifest
    const manifest = Manifest.fromArtifacts(
      artifacts,
      ManifestConstants.SCHEMA_VERSION,
      baselineManifest ?? Manifest.getDefault(schemaVersion)
    );

    return manifest;
  }

  /**
   * Dispatches the manifest by writing it to the endpoint package config, if different
   * from the manifest already in the config.
   *
   * @param manifest The Manifest to dispatch.
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async tryDispatch(manifest: Manifest): Promise<Error[]> {
    const serializedManifest = manifest.toEndpointFormat();
    if (!manifestDispatchSchema.is(serializedManifest)) {
      return [new Error('Invalid manifest')];
    }

    let paging = true;
    let page = 1;
    const errors: Error[] = [];

    while (paging) {
      const { items, total } = await this.packageConfigService.list(this.savedObjectsClient, {
        page,
        perPage: 20,
        kuery: 'ingest-package-configs.package.name:endpoint',
      });

      for (const packageConfig of items) {
        const { id, revision, updated_at, updated_by, ...newPackageConfig } = packageConfig;
        if (newPackageConfig.inputs.length > 0 && newPackageConfig.inputs[0].config !== undefined) {
          const artifactManifest = newPackageConfig.inputs[0].config.artifact_manifest ?? {
            value: {},
          };

          const oldManifest =
            Manifest.fromPkgConfig(artifactManifest.value) ??
            Manifest.getDefault(ManifestConstants.SCHEMA_VERSION);
          if (!manifest.equals(oldManifest)) {
            newPackageConfig.inputs[0].config.artifact_manifest = {
              value: serializedManifest,
            };

            try {
              await this.packageConfigService.update(this.savedObjectsClient, id, newPackageConfig);
              this.logger.debug(
                `Updated package config ${id} with manifest version ${manifest.getSha256()}`
              );
            } catch (err) {
              errors.push(err);
            }
          } else {
            this.logger.debug(`No change in package config: ${id}`);
          }
        } else {
          errors.push(new Error(`Package config ${id} has no config.`));
        }
      }

      paging = page * items.length < total;
      page++;
    }

    return errors;
  }

  /**
   * Commits a manifest to indicate that a new version has been computed.
   *
   * @param manifest The Manifest to commit.
   * @returns {Promise<Error | null>} An error, if encountered, or null.
   */
  public async commit(manifest: Manifest): Promise<Error | null> {
    try {
      const manifestClient = this.getManifestClient(manifest.getSchemaVersion());

      // Commit the new manifest
      const manifestSo = manifest.toSavedObject();
      const version = manifest.getSoVersion();

      if (version == null) {
        await manifestClient.createManifest(manifestSo);
      } else {
        await manifestClient.updateManifest(manifestSo, {
          version,
        });
      }

      this.logger.info(`Committed manifest ${manifest.getSha256()}`);
    } catch (err) {
      return err;
    }

    return null;
  }
}
