/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ArtifactService } from './artifact_service';
import { getInternalArtifactSchemaMock } from '../../schemas';

export class ArtifactServiceMock extends ArtifactService {
  public getArtifact = jest.fn().mockResolvedValue(getInternalArtifactSchemaMock());
  public createArtifact = jest.fn().mockResolvedValue(getInternalArtifactSchemaMock());
  public deleteArtifact = jest.fn().mockResolvedValue(getInternalArtifactSchemaMock());
}
