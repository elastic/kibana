/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ArtifactClient } from './artifact_client';
import { getInternalArtifactSchemaMock } from '../../schemas';

export class ArtifactClientMock extends ArtifactClient {
  public getArtifact = jest.fn().mockResolvedValue(getInternalArtifactSchemaMock());
  public createArtifact = jest.fn().mockResolvedValue(getInternalArtifactSchemaMock());
  public deleteArtifact = jest.fn().mockResolvedValue(getInternalArtifactSchemaMock());
}
