/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObject,
  SavedObjectsClient,
  SavedObjectsUpdateResponse,
} from '../../../../../../../src/core/server';
import { ManifestConstants } from '../../lib/artifacts';
import { InternalManifestSchema } from '../../schemas/artifacts';

interface UpdateManifestOpts {
  version: string;
}

export class ManifestClient {
  private schemaVersion: string;
  private savedObjectsClient: SavedObjectsClient;

  constructor(savedObjectsClient: SavedObjectsClient, schemaVersion: string) {
    this.savedObjectsClient = savedObjectsClient;
    this.schemaVersion = schemaVersion;
  }

  private getManifestId(): string {
    return `endpoint-manifest-${this.schemaVersion}`;
  }

  public async getManifest(): Promise<SavedObject<InternalManifestSchema>> {
    return this.savedObjectsClient.get<InternalManifestSchema>(
      ManifestConstants.SAVED_OBJECT_TYPE,
      this.getManifestId()
    );
  }

  public async createManifest(
    manifest: InternalManifestSchema
  ): Promise<SavedObject<InternalManifestSchema>> {
    return this.savedObjectsClient.create<InternalManifestSchema>(
      ManifestConstants.SAVED_OBJECT_TYPE,
      manifest,
      { id: this.getManifestId() }
    );
  }

  public async updateManifest(
    manifest: InternalManifestSchema,
    opts?: UpdateManifestOpts
  ): Promise<SavedObjectsUpdateResponse<InternalManifestSchema>> {
    return this.savedObjectsClient.update<InternalManifestSchema>(
      ManifestConstants.SAVED_OBJECT_TYPE,
      this.getManifestId(),
      manifest,
      opts
    );
  }

  public async deleteManifest() {
    return this.savedObjectsClient.delete(
      ManifestConstants.SAVED_OBJECT_TYPE,
      this.getManifestId()
    );
  }
}
