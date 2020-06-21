/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from '../../../../../../../src/core/server';
import { ArtifactConstants } from '../../lib/artifacts';
import { InternalArtifactSchema } from '../../schemas/artifacts';

export interface ArtifactServiceOptions {
  savedObjectsClient: SavedObjectsClient;
}

export class ArtifactService {
  private soClient: SavedObjectsClient;

  constructor(context: ArtifactServiceOptions) {
    this.soClient = context.savedObjectsClient;
  }

  public async getArtifact(id: string) {
    // TODO: add sha256 to id?
    return this.soClient.get<InternalArtifactSchema>(ArtifactConstants.SAVED_OBJECT_TYPE, id);
  }

  public async createArtifact(artifact: InternalArtifactSchema) {
    return this.soClient.create<InternalArtifactSchema>(
      ArtifactConstants.SAVED_OBJECT_TYPE,
      artifact,
      { id: `${artifact.identifier}-${artifact.sha256}` }
    );
  }
}
