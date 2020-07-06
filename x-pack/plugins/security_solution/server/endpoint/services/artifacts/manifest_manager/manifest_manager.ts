/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObjectsClientContract, SavedObject } from 'src/core/server';
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
import { InternalArtifactSchema, InternalManifestSchema } from '../../../schemas/artifacts';
import { ArtifactClient } from '../artifact_client';
import { ManifestClient } from '../manifest_client';

export interface ManifestManagerContext {
  savedObjectsClient: SavedObjectsClientContract;
  artifactClient: ArtifactClient;
  exceptionListClient: ExceptionListClient;
  packageConfigService: PackageConfigServiceInterface;
  logger: Logger;
  cache: ExceptionsCache;
}

export interface ManifestRefreshOpts {
  initialize?: boolean;
}

export interface WrappedManifest {
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

  private getManifestClient(schemaVersion: string): ManifestClient {
    return new ManifestClient(this.savedObjectsClient, schemaVersion as ManifestSchemaVersion);
  }

  private async buildExceptionListArtifacts(
    schemaVersion: string
  ): Promise<InternalArtifactSchema[]> {
    const artifacts: InternalArtifactSchema[] = [];

    for (const os of ArtifactConstants.SUPPORTED_OPERATING_SYSTEMS) {
      const exceptionList = await getFullEndpointExceptionList(
        this.exceptionListClient,
        os,
        schemaVersion
      );
      const artifact = await buildArtifact(exceptionList, os, schemaVersion);

      artifacts.push(artifact);
    }

    return artifacts;
  }

  private async getLastDispatchedManifest(schemaVersion: string): Promise<Manifest | null> {
    return this.getManifestClient(schemaVersion)
      .getManifest()
      .then(async (manifestSo: SavedObject<InternalManifestSchema>) => {
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
      })
      .catch((err) => {
        if (err.output.statusCode !== 404) {
          throw err;
        }
        return null;
      });
  }

  public async refresh(opts?: ManifestRefreshOpts): Promise<WrappedManifest | null> {
    let oldManifest: Manifest | null;

    // Get the last-dispatched manifest
    oldManifest = await this.getLastDispatchedManifest(ManifestConstants.SCHEMA_VERSION);

    if (oldManifest === null && opts !== undefined && opts.initialize) {
      oldManifest = new Manifest(new Date(), ManifestConstants.SCHEMA_VERSION, 'v0'); // create empty manifest
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

    // Create new artifacts
    for (const diff of diffs) {
      if (diff.type === 'add') {
        const artifact = newManifest.getArtifact(diff.id);
        try {
          await this.artifactClient.createArtifact(artifact);
          // Cache the body of the artifact
          this.cache.set(diff.id, artifact.body);
        } catch (err) {
          if (err.status === 409) {
            // This artifact already existed...
            this.logger.debug(`Tried to create artifact ${diff.id}, but it already exists.`);
          } else {
            throw err;
          }
        }
      }
    }

    return {
      manifest: newManifest,
      diffs,
    };
  }

  /**
   * Dispatches the manifest by writing it to the endpoint packageConfig.
   *
   * @return {WrappedManifest | null} WrappedManifest if all dispatched, else null
   */
  public async dispatch(wrappedManifest: WrappedManifest | null): Promise<WrappedManifest | null> {
    if (wrappedManifest === null) {
      this.logger.debug('wrappedManifest was null, aborting dispatch');
      return null;
    }

    function showDiffs(diffs: ManifestDiff[]) {
      return diffs.map((diff) => {
        const op = diff.type === 'add' ? '(+)' : '(-)';
        return `${op}${diff.id}`;
      });
    }

    if (wrappedManifest.diffs.length > 0) {
      this.logger.info(`Dispatching new manifest with diffs: ${showDiffs(wrappedManifest.diffs)}`);

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

          if (
            newPackageConfig.inputs.length > 0 &&
            newPackageConfig.inputs[0].config !== undefined
          ) {
            const artifactManifest = newPackageConfig.inputs[0].config.artifact_manifest ?? {
              value: {},
            };
            artifactManifest.value = wrappedManifest.manifest.toEndpointFormat();
            newPackageConfig.inputs[0].config.artifact_manifest = artifactManifest;

            await this.packageConfigService
              .update(this.savedObjectsClient, id, newPackageConfig)
              .then((response) => {
                this.logger.debug(`Updated package config ${id}`);
              })
              .catch((err) => {
                success = false;
                this.logger.debug(`Error updating package config ${id}`);
                this.logger.error(err);
              });
          } else {
            success = false;
            this.logger.debug(`Package config ${id} has no config.`);
          }
        }

        paging = page * items.length < total;
        page++;
      }

      return success ? wrappedManifest : null;
    } else {
      this.logger.debug('No manifest diffs [no-op]');
    }

    return null;
  }

  public async commit(wrappedManifest: WrappedManifest | null) {
    if (wrappedManifest === null) {
      this.logger.debug('wrappedManifest was null, aborting commit');
      return;
    }

    const manifestClient = this.getManifestClient(wrappedManifest.manifest.getSchemaVersion());

    // Commit the new manifest
    if (wrappedManifest.manifest.getVersion() === 'v0') {
      await manifestClient.createManifest(wrappedManifest.manifest.toSavedObject());
    } else {
      const version = wrappedManifest.manifest.getVersion();
      if (version === 'v0') {
        throw new Error('Updating existing manifest with baseline version. Bad state.');
      }
      await manifestClient.updateManifest(wrappedManifest.manifest.toSavedObject(), {
        version,
      });
    }

    this.logger.info(`Commited manifest ${wrappedManifest.manifest.getVersion()}`);

    // Clean up old artifacts
    for (const diff of wrappedManifest.diffs) {
      try {
        if (diff.type === 'delete') {
          await this.artifactClient.deleteArtifact(diff.id);
          this.logger.info(`Cleaned up artifact ${diff.id}`);
        }
      } catch (err) {
        this.logger.error(err);
      }
    }
  }
}
