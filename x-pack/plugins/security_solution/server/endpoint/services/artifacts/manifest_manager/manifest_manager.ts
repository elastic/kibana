/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObjectsClient } from '../../../../../../../../src/core/server';
import { DatasourceServiceInterface } from '../../../../../../ingest_manager/server';
import { ExceptionListClient } from '../../../../../../lists/server';
import { NewPolicyData } from '../../../../../common/endpoint/types';
import {
  ArtifactConstants,
  ManifestConstants,
  Manifest,
  buildArtifact,
  getFullEndpointExceptionList,
  ExceptionsCache,
} from '../../../lib/artifacts';
import { InternalArtifactSchema, InternalManifestSchema } from '../../../schemas/artifacts';
import { ArtifactClient } from '../artifact_client';
import { ManifestClient } from '../manifest_client';

export interface ManifestManagerContext {
  savedObjectsClient: SavedObjectsClient;
  artifactClient: ArtifactClient;
  exceptionListClient: ExceptionListClient;
  datasourceService: DatasourceServiceInterface;
  logger: Logger;
  cache: ExceptionsCache;
}

export interface ManifestRefreshOpts {
  initialize?: boolean;
}

export interface NewManifestState {
  manifest: Manifest;
  diffs: ManifestDiff[];
}

export class ManifestManager {
  private artifactClient: ArtifactClient;
  private exceptionListClient: ExceptionListClient;
  private datasourceService: DatasourceServiceInterface;
  private savedObjectsClient: SavedObjectsClient;
  private logger: Logger;
  private cache: ExceptionsCache;

  constructor(context: ManifestManagerContext) {
    this.artifactClient = context.artifactClient;
    this.exceptionListClient = context.exceptionListClient;
    this.datasourceService = context.datasourceService;
    this.savedObjectsClient = context.savedObjectsClient;
    this.logger = context.logger;
    this.cache = context.cache;
  }

  private getManifestClient(schemaVersion: string): ManifestClient {
    return new ManifestClient(this.savedObjectsClient, schemaVersion);
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
    const manifestClient = this.getManifestClient(schemaVersion);

    let manifestSo: InternalManifestSchema;
    try {
      manifestSo = await manifestClient.getManifest();
    } catch (err) {
      if (err.output.statusCode !== 404) {
        throw err;
      }
    }

    if (manifestSo !== undefined) {
      const manifest = new Manifest(manifestSo.attributes.created, schemaVersion);
      manifest.setVersion(manifestSo.version);

      for (const id of manifestSo.attributes.ids) {
        const artifactSo = await this.artifactClient.getArtifact(id);
        manifest.addEntry(artifactSo.attributes);
      }

      return manifest;
    } else {
      return null;
    }
  }

  public async refresh(opts?: ManifestRefreshOpts): Promise<NewManifestState | null> {
    let oldManifest: Manifest;

    // Get the last-dispatched manifest
    oldManifest = await this.getLastDispatchedManifest(ManifestConstants.SCHEMA_VERSION);
    // console.log(oldManifest);

    if (oldManifest === null && opts !== undefined && opts.initialize) {
      oldManifest = new Manifest(new Date(), ManifestConstants.SCHEMA_VERSION); // create empty manifest
    } else if (oldManifest == null) {
      this.logger.debug('Manifest does not exist yet. Waiting...');
      return null;
    }

    // Build new exception list artifacts
    const artifacts = await this.buildExceptionListArtifacts(ArtifactConstants.SCHEMA_VERSION);

    // Build new manifest
    const newManifest = Manifest.fromArtifacts(artifacts, ManifestConstants.SCHEMA_VERSION);
    newManifest.setVersion(oldManifest.getVersion());

    // Get diffs
    const diffs = newManifest.diff(oldManifest);

    // Create new artifacts
    diffs.forEach(async (diff) => {
      if (diff.type === 'add') {
        const artifact = newManifest.getArtifact(diff.id);
        try {
          await this.artifactClient.createArtifact(artifact);
          // Cache the compressed body of the artifact
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
    }, this);

    return {
      manifest: newManifest,
      diffs,
    };
  }

  /**
   * Dispatches the manifest by writing it to the endpoint datasource.
   *
   * @return {boolean} True if dispatched.
   */
  public async dispatch(manifestState: NewManifestState | null): boolean {
    if (manifestState === null) {
      this.logger.debug('manifestState was null, aborting dispatch');
      return false;
    }

    if (manifestState.diffs.length > 0) {
      this.logger.info(`Dispatching new manifest with diffs: ${manifestState.diffs}`);

      let paging = true;
      let success = true;

      while (paging) {
        const { items, total, page } = await this.datasourceService.list(this.savedObjectsClient, {
          kuery: 'ingest-datasources.package.name:endpoint',
        });

        items.forEach(async (datasource) => {
          const { id, revision, updated_at, updated_by, ...newDatasource } = datasource;

          if (newDatasource.inputs.length > 0) {
            newDatasource.inputs[0].config.artifact_manifest = manifestState.manifest.toEndpointFormat();

            this.datasourceService
              .update(this.savedObjectsClient, id, newDatasource)
              .then((response) => {
                this.logger.debug(`Updated datasource ${id}`);
              })
              .catch((err) => {
                success = false;
                this.logger.debug(`Error updating datasource ${id}`);
                this.logger.error(err);
              });
          } else {
            success = false;
            this.logger.debug(`Datasource ${id} has no inputs.`);
          }
        }, this);

        paging = page * items.length < total;
      }

      return success;
    } else {
      this.logger.debug('No manifest diffs [no-op]');
    }

    return false;
  }

  public async commit(manifestState: NewManifestState | null) {
    if (manifestState === null) {
      this.logger.debug('manifestState was null, aborting commit');
      return;
    }

    const manifestClient = this.getManifestClient(manifestState.manifest.getSchemaVersion());

    // Commit the new manifest
    if (manifestState.manifest.getVersion() === undefined) {
      await manifestClient.createManifest(manifestState.manifest.toSavedObject());
    } else {
      const version = manifestState.manifest.getVersion();
      if (version === 'baseline') {
        throw new Error('Updating existing manifest with baseline version. Bad state.');
      }
      await manifestClient.updateManifest(manifestState.manifest.toSavedObject(), {
        version,
      });
    }

    // Clean up old artifacts
    manifestState.diffs.forEach(async (diff) => {
      try {
        if (diff.type === 'delete') {
          await this.artifactClient.deleteArtifact(diff.id);
        }
      } catch (err) {
        this.logger.error(err);
      }
    }, this);
  }
}
