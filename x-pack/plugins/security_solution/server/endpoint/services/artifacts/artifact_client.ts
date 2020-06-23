/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClient } from '../../../../../../../src/core/server';
import { ArtifactConstants } from '../../lib/artifacts';
import { InternalArtifactSchema } from '../../schemas/artifacts';

export class ArtifactClient {
  private savedObjectsClient: SavedObjectsClient;

  constructor(savedObjectsClient: SavedObjectsClient) {
    this.savedObjectsClient = savedObjectsClient;
  }

  public async getArtifact(id: string): Promise<SavedObject<InternalArtifactSchema>> {
    return this.savedObjectsClient.get<InternalArtifactSchema>(
      ArtifactConstants.SAVED_OBJECT_TYPE,
      id
    );
  }

  public async createArtifact(
    artifact: InternalArtifactSchema
  ): Promise<SavedObject<InternalArtifactSchema>> {
    return this.savedObjectsClient.create<InternalArtifactSchema>(
      ArtifactConstants.SAVED_OBJECT_TYPE,
      artifact,
      { id: `${artifact.identifier}-${artifact.sha256}` }
    );
  }

  public async deleteArtifact(id: string) {
    return this.savedObjectsClient.delete(ArtifactConstants.SAVED_OBJECT_TYPE, id);
  }
}
