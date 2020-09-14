/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import { ArtifactConstants, getArtifactId } from '../../lib/artifacts';
import {
  InternalArtifactCompleteSchema,
  InternalArtifactCreateSchema,
} from '../../schemas/artifacts';

export class ArtifactClient {
  private savedObjectsClient: SavedObjectsClientContract;

  constructor(savedObjectsClient: SavedObjectsClientContract) {
    this.savedObjectsClient = savedObjectsClient;
  }

  public async getArtifact(id: string): Promise<SavedObject<InternalArtifactCompleteSchema>> {
    return this.savedObjectsClient.get<InternalArtifactCompleteSchema>(
      ArtifactConstants.SAVED_OBJECT_TYPE,
      id
    );
  }

  public async createArtifact(
    artifact: InternalArtifactCompleteSchema
  ): Promise<SavedObject<InternalArtifactCompleteSchema>> {
    return this.savedObjectsClient.create<InternalArtifactCreateSchema>(
      ArtifactConstants.SAVED_OBJECT_TYPE,
      {
        ...artifact,
        created: Date.now(),
      },
      { id: getArtifactId(artifact) }
    );
  }

  public async deleteArtifact(id: string) {
    return this.savedObjectsClient.delete(ArtifactConstants.SAVED_OBJECT_TYPE, id);
  }
}
