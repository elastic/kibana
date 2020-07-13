/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObjectsClientContract } from 'src/core/server';
import { createHash } from 'crypto';
import { PackageConfigServiceInterface } from '../../../../../../ingest_manager/server';
import { ExceptionListClient } from '../../../../../../lists/server';
import { ManifestSchemaVersion } from '../../../../../common/endpoint/schema/common';
import {
  ArtifactConstants,
  ManifestConstants,
  Manifest,
  buildArtifact,
  getFullEndpointExceptionList,
  ExceptionsCache,
  ManifestDiff,
} from '../../../lib/artifacts';
import { InternalArtifactSchema } from '../../../schemas/artifacts';
import { ArtifactClient } from '../artifact_client';
import { ManifestClient } from '../manifest_client';
import { compressExceptionList } from '../../../lib/artifacts/lists';

export interface ManifestManagerContext {
  savedObjectsClient: SavedObjectsClientContract;
  artifactClient: ArtifactClient;
  exceptionListClient: ExceptionListClient;
  packageConfigService: PackageConfigServiceInterface;
  logger: Logger;
  cache: ExceptionsCache;
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
  protected cache: ExceptionsCache;

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
   * @returns {Promise<InternalArtifactSchema[]>} An array of uncompressed artifacts built from exception-list-agnostic SOs.
   * @throws Throws/rejects if there are errors building the list.
   */
  protected async buildExceptionListArtifacts(
    schemaVersion: string
  ): Promise<InternalArtifactSchema[]> {
    // TODO: should wrap in try/catch?
    return ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS.reduce(
      async (acc: Promise<InternalArtifactSchema[]>, os) => {
        const exceptionList = await getFullEndpointExceptionList(
          this.exceptionListClient,
          os,
          schemaVersion
        );
        const artifacts = await acc;
        const artifact = await buildArtifact(exceptionList, os, schemaVersion);
        artifacts.push(artifact);
        return Promise.resolve(artifacts);
      },
      Promise.resolve([])
    );
  }

  /**
   * Writes new artifact SOs based on provided snapshot.
   *
   * @param snapshot A ManifestSnapshot to use for writing the artifacts.
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  private async writeArtifacts(snapshot: ManifestSnapshot): Promise<Error[]> {
    const errors: Error[] = [];
    for (const diff of snapshot.diffs) {
      const artifact = snapshot.manifest.getArtifact(diff.id);
      if (artifact === undefined) {
        throw new Error(
          `Corrupted manifest detected. Diff contained artifact ${diff.id} not in manifest.`
        );
      }

      const compressedArtifact = await compressExceptionList(Buffer.from(artifact.body, 'base64'));
      artifact.body = compressedArtifact.toString('base64');
      artifact.encodedSize = compressedArtifact.byteLength;
      artifact.compressionAlgorithm = 'zlib';
      artifact.encodedSha256 = createHash('sha256').update(compressedArtifact).digest('hex');

      try {
        // Write the artifact SO
        await this.artifactClient.createArtifact(artifact);
        // Cache the compressed body of the artifact
        this.cache.set(diff.id, Buffer.from(artifact.body, 'base64'));
      } catch (err) {
        if (err.status === 409) {
          this.logger.debug(`Tried to create artifact ${diff.id}, but it already exists.`);
        } else {
          // TODO: log error here?
          errors.push(err);
        }
      }
    }
    return errors;
  }

  /**
   * Deletes old artifact SOs based on provided snapshot.
   *
   * @param snapshot A ManifestSnapshot to use for deleting the artifacts.
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  private async deleteArtifacts(snapshot: ManifestSnapshot): Promise<Error[]> {
    const errors: Error[] = [];
    for (const diff of snapshot.diffs) {
      try {
        // Delete the artifact SO
        await this.artifactClient.deleteArtifact(diff.id);
        // TODO: should we delete the cache entry here?
        this.logger.info(`Cleaned up artifact ${diff.id}`);
      } catch (err) {
        errors.push(err);
      }
    }
    return errors;
  }

  /**
   * Returns the last dispatched manifest based on the current state of the
   * user-artifact-manifest SO.
   *
   * @param schemaVersion The schema version of the manifest.
   * @returns {Promise<Manifest | null>} The last dispatched manifest, or null if does not exist.
   * @throws Throws/rejects if there is an unexpected error retrieving the manifest.
   */
  public async getLastDispatchedManifest(schemaVersion: string): Promise<Manifest | null> {
    try {
      const manifestClient = this.getManifestClient(schemaVersion);
      const manifestSo = await manifestClient.getManifest();

      if (manifestSo.version === undefined) {
        throw new Error('No version returned for manifest.');
      }

      const manifest = new Manifest(
        new Date(manifestSo.attributes.created),
        schemaVersion,
        manifestSo.version
      );

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
   * Snapshots a manifest based on current state of exception-list-agnostic SOs.
   *
   * @param opts Optional parameters for snapshot retrieval.
   * @param opts.initialize Initialize a new Manifest when no manifest SO can be retrieved.
   * @returns {Promise<ManifestSnapshot | null>} A snapshot of the manifest, or null if not initialized.
   */
  public async getSnapshot(opts?: ManifestSnapshotOpts): Promise<ManifestSnapshot | null> {
    try {
      let oldManifest: Manifest | null;

      // Get the last-dispatched manifest
      oldManifest = await this.getLastDispatchedManifest(ManifestConstants.SCHEMA_VERSION);

      if (oldManifest === null && opts !== undefined && opts.initialize) {
        oldManifest = new Manifest(
          new Date(),
          ManifestConstants.SCHEMA_VERSION,
          ManifestConstants.INITIAL_VERSION
        ); // create empty manifest
      } else if (oldManifest == null) {
        this.logger.debug('Manifest does not exist yet. Waiting...');
        return null;
      }

      // Build new exception list artifacts
      const artifacts = await this.buildExceptionListArtifacts(ArtifactConstants.SCHEMA_VERSION);

      // Build new manifest
      const newManifest = Manifest.fromArtifacts(
        artifacts,
        ManifestConstants.SCHEMA_VERSION,
        oldManifest
      );

      // Get diffs
      const diffs = newManifest.diff(oldManifest);

      return {
        manifest: newManifest,
        diffs,
      };
    } catch (err) {
      this.logger.error(err);
      return null;
    }
  }

  /**
   * Syncs artifacts based on provided snapshot.
   *
   * Creates artifacts that do not yet exist and cleans up old artifacts that have been
   * superceded by this snapshot.
   *
   * @param snapshot A ManifestSnapshot to use for sync.
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async syncArtifacts(
    snapshot: ManifestSnapshot,
    diffType: 'add' | 'delete'
  ): Promise<Error[]> {
    const filteredDiffs = snapshot.diffs.filter((diff) => {
      return diff.type === diffType;
    });

    const tmpSnapshot = { ...snapshot };
    tmpSnapshot.diffs = filteredDiffs;

    if (diffType === 'add') {
      return this.writeArtifacts(tmpSnapshot);
    } else if (diffType === 'delete') {
      return this.deleteArtifacts(tmpSnapshot);
    }

    return [new Error(`Unsupported diff type: ${diffType}`)];
  }

  /**
   * Dispatches the manifest by writing it to the endpoint package config.
   *
   * @param manifest The Manifest to dispatch.
   * @returns {Promise<Error[]>} Any errors encountered.
   */
  public async dispatch(manifest: Manifest): Promise<Error[]> {
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
          artifactManifest.value = manifest.toEndpointFormat();
          newPackageConfig.inputs[0].config.artifact_manifest = artifactManifest;

          try {
            await this.packageConfigService.update(this.savedObjectsClient, id, newPackageConfig);
            this.logger.debug(
              `Updated package config ${id} with manifest version ${manifest.getVersion()}`
            );
          } catch (err) {
            errors.push(err);
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
   * Commits a manifest to indicate that it has been dispatched.
   *
   * @param manifest The Manifest to commit.
   * @returns {Promise<Error | null>} An error if encountered, or null if successful.
   */
  public async commit(manifest: Manifest): Promise<Error | null> {
    try {
      const manifestClient = this.getManifestClient(manifest.getSchemaVersion());

      // Commit the new manifest
      if (manifest.getVersion() === ManifestConstants.INITIAL_VERSION) {
        await manifestClient.createManifest(manifest.toSavedObject());
      } else {
        const version = manifest.getVersion();
        if (version === ManifestConstants.INITIAL_VERSION) {
          throw new Error('Updating existing manifest with baseline version. Bad state.');
        }
        await manifestClient.updateManifest(manifest.toSavedObject(), {
          version,
        });
      }

      this.logger.info(`Committed manifest ${manifest.getVersion()}`);
    } catch (err) {
      return err;
    }

    return null;
  }

  /**
   * Confirms that a packageConfig exists with provided name.
   */
  public async confirmPackageConfigExists(name: string) {
    // TODO: what if there are multiple results? uh oh.
    const { total } = await this.packageConfigService.list(this.savedObjectsClient, {
      page: 1,
      perPage: 20,
      kuery: `ingest-package-configs.name:${name}`,
    });
    return total > 0;
  }
}
