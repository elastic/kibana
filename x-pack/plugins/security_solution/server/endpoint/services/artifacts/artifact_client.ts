/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import { ArtifactConstants } from '../../lib/artifacts';
import { InternalArtifactSchema } from '../../schemas/artifacts';

export class ArtifactClient {
  private savedObjectsClient: SavedObjectsClientContract;

  constructor(savedObjectsClient: SavedObjectsClientContract) {
    this.savedObjectsClient = savedObjectsClient;
  }

  public getArtifactId(artifact: InternalArtifactSchema) {
    return `${artifact.identifier}-${artifact.decodedSha256}`;
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
      { id: this.getArtifactId(artifact) }
    );
  }

  public async deleteArtifact(id: string) {
    return this.savedObjectsClient.delete(ArtifactConstants.SAVED_OBJECT_TYPE, id);
  }
}
