/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from '../../../../../../../src/core/server';
import { Manifest, ManifestConstants } from '../../lib/artifacts';
import { InternalManifestSchema } from '../../schemas/artifacts';
import { ArtifactService } from './artifact_service';

export interface ManifestServiceOptions {
  artifactService: ArtifactService;
  savedObjectsClient: SavedObjectsClient;
}

export class ManifestService {
  private artifactService: ArtifactService;
  private soClient: SavedObjectsClient;

  constructor(context: ManifestServiceOptions) {
    this.artifactService = context.artifactService;
    this.soClient = context.savedObjectsClient;
  }

  private getManifestId(schemaVersion: string): string {
    return `endpoint-manifest-${schemaVersion}`;
  }

  public async getManifest(schemaVersion: string): Promise<Manifest> {
    const manifestSo = await this.soClient.get<InternalManifestSchema>(
      ManifestConstants.SAVED_OBJECT_TYPE,
      this.getManifestId(schemaVersion)
    );

    const manifest = new Manifest(manifestSo.attributes.schemaVersion);
    manifest.setVersion(manifestSo.version);

    for (const id of manifestSo.attributes.ids) {
      const artifactSo = await this.artifactService.getArtifact(id);
      manifest.addEntry(artifactSo.attributes);
    }

    return manifest;
  }

  public async dispatchAndUpdate(manifest: Manifest) {
    // TODO
    // 1. Dispatch the manifest
    // 2. Update the manifest in ES (ONLY if successful)
    // 3. Use version to resolve conflicts
    // 4. If update fails, it was likely already dispatched and updated
    //    And if not, we'll redispatch it and update next time.
    if (manifest.getVersion() === undefined) {
      await this.soClient.create<InternalManifestSchema>(
        ManifestConstants.SAVED_OBJECT_TYPE,
        manifest.toSavedObject(),
        { id: this.getManifestId(manifest.getSchemaVersion()) }
      );
    } else {
      try {
        await this.soClient.update<InternalManifestSchema>(
          ManifestConstants.SAVED_OBJECT_TYPE,
          this.getManifestId(manifest.getSchemaVersion()),
          manifest.toSavedObject(),
          { version: manifest.getVersion() }
        );
      } catch (err) {
        if (err.status === 409) {
          // TODO: log and return
        } else {
          throw err;
        }
      }
    }
  }
}
