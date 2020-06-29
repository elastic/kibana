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

export interface WrappedManifest {
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

  public async refresh(opts?: ManifestRefreshOpts): Promise<WrappedManifest | null> {
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
    for (const diff of diffs) {
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
    }

    return {
      manifest: newManifest,
      diffs,
    };
  }

  /**
   * Dispatches the manifest by writing it to the endpoint datasource.
   *
   * @return {WrappedManifest | null} WrappedManifest if all dispatched, else null
   */
  public async dispatch(wrappedManifest: WrappedManifest | null): WrappedManifest | null {
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
      let success = true;

      while (paging) {
        const { items, total, page } = await this.datasourceService.list(this.savedObjectsClient, {
          kuery: 'ingest-datasources.package.name:endpoint',
        });

        for (const datasource of items) {
          const { id, revision, updated_at, updated_by, ...newDatasource } = datasource;

          if (newDatasource.inputs.length > 0) {
            newDatasource.inputs[0].config.artifact_manifest = wrappedManifest.manifest.toEndpointFormat();

            await this.datasourceService
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
        }

        paging = page * items.length < total;
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
    if (wrappedManifest.manifest.getVersion() === undefined) {
      await manifestClient.createManifest(wrappedManifest.manifest.toSavedObject());
    } else {
      const version = wrappedManifest.manifest.getVersion();
      if (version === 'baseline') {
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
