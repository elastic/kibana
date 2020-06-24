/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObjectsClient } from '../../../../../../../../src/core/server';
import { ExceptionListClient } from '../../../../../../lists/server';
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
  logger: Logger;
  cache: ExceptionsCache;
}

export class ManifestManager {
  private artifactClient: ArtifactClient;
  private exceptionListClient: ExceptionListClient;
  private savedObjectsClient: SavedObjectsClient;
  private logger: Logger;
  private cache: ExceptionsCache;

  constructor(context: ManifestManagerContext) {
    this.artifactClient = context.artifactClient;
    this.exceptionListClient = context.exceptionListClient;
    this.savedObjectsClient = context.savedObjectsClient;
    this.logger = context.logger;
    this.cache = context.cache;
  }

  private async getManifestClient(schemaVersion: string): Promise<ManifestClient> {
    return new ManifestClient(this.savedObjectsClient, schemaVersion);
  }

  private async dispatch(manifest: Manifest) {
    const manifestClient = this.getManifestClient(manifest.getSchemaVersion());

    // TODO: dispatch and only update if successful

    if (manifest.getVersion() === undefined) {
      await manifestClient.createManifest(manifest.toSavedObject());
    } else {
      await manifestClient.updateManifest(manifest.toSavedObject(), {
        version: manifest.getVersion(),
      });
    }
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

  public async refresh(createInitial: boolean) {
    let oldManifest: Manifest;

    // Get the last-dispatched manifest
    try {
      oldManifest = await this.getLastDispatchedManifest(ManifestConstants.SCHEMA_VERSION);
    } catch (err) {
      this.logger.error(err);
      return;
    }

    if (oldManifest === null) {
      if (createInitial) {
        // TODO: implement this when ready to integrate with Paul's code
        oldManifest = new Manifest(new Date(), ManifestConstants.SCHEMA_VERSION); // create empty manifest
      } else {
        this.logger.debug('Manifest does not exist yet. Waiting...');
        return;
      }
    }

    this.logger.debug(oldManifest);

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
          this.cache.set(`${artifact.identifier}-${artifact.sha256}`, artifact.body);
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

    // Dispatch manifest if new
    if (diffs.length > 0) {
      try {
        this.logger.debug('Dispatching new manifest');
        await this.dispatch(newManifest);
      } catch (err) {
        this.logger.error(err);
        return;
      }
    }

    // Clean up old artifacts
    diffs.forEach(async (diff) => {
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
