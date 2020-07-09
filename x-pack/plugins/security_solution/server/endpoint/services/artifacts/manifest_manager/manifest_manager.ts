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
   * @param schemaVersion
   */
  private getManifestClient(schemaVersion: string) {
    return new ManifestClient(this.savedObjectsClient, schemaVersion as ManifestSchemaVersion);
  }

  /**
   * Builds an array of artifacts (one per supported OS) based on the current
   * state of exception-list-agnostic SO's.
   *
   * @param schemaVersion
   */
  private async buildExceptionListArtifacts(schemaVersion: string) {
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
   * Returns the last dispatched manifest based on the current state of the
   * user-artifact-manifest SO.
   *
   * @param schemaVersion
   */
  private async getLastDispatchedManifest(schemaVersion: string) {
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
   * @param opts TODO
   */
  public async getSnapshot(opts?: ManifestSnapshotOpts) {
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
        oldManifest.getVersion()
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
   * Can be filtered to apply one or both operations.
   *
   * @param snapshot
   * @param diffType
   */
  public async syncArtifacts(snapshot: ManifestSnapshot, diffType?: 'add' | 'delete') {
    const filteredDiffs = snapshot.diffs.reduce((diffs: ManifestDiff[], diff) => {
      if (diff.type === diffType || diffType === undefined) {
        diffs.push(diff);
      } else if (!['add', 'delete'].includes(diff.type)) {
        // TODO: replace with io-ts schema
        throw new Error(`Unsupported diff type: ${diff.type}`);
      }
      return diffs;
    }, []);

    const adds = filteredDiffs.filter((diff) => {
      return diff.type === 'add';
    });

    const deletes = filteredDiffs.filter((diff) => {
      return diff.type === 'delete';
    });

    for (const diff of adds) {
      const artifact = snapshot.manifest.getArtifact(diff.id);
      const compressedArtifact = await compressExceptionList(Buffer.from(artifact.body, 'base64'));
      artifact.body = compressedArtifact.toString('base64');
      artifact.encodedSize = compressedArtifact.byteLength;
      artifact.compressionAlgorithm = 'zlib';
      artifact.encodedSha256 = createHash('sha256').update(compressedArtifact).digest('hex');

      try {
        await this.artifactClient.createArtifact(artifact);
      } catch (err) {
        if (err.status === 409) {
          this.logger.debug(`Tried to create artifact ${diff.id}, but it already exists.`);
        } else {
          throw err;
        }
      }
      // Cache the body of the artifact
      this.cache.set(diff.id, Buffer.from(artifact.body, 'base64'));
    }

    for (const diff of deletes) {
      await this.artifactClient.deleteArtifact(diff.id);
      // TODO: should we delete the cache entry here?
      this.logger.info(`Cleaned up artifact ${diff.id}`);
    }
  }

  /**
   * Dispatches the manifest by writing it to the endpoint package config.
   *
   */
  public async dispatch(manifest: Manifest) {
    let paging = true;
    let page = 1;
    let success = true;

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
            success = false;
            this.logger.debug(`Error updating package config ${id}`);
            this.logger.error(err);
          }
        } else {
          success = false;
          this.logger.debug(`Package config ${id} has no config.`);
        }
      }

      paging = page * items.length < total;
      page++;
    }

    // TODO: revisit success logic
    return success;
  }

  /**
   * Commits a manifest to indicate that it has been dispatched.
   *
   * @param manifest
   */
  public async commit(manifest: Manifest) {
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
