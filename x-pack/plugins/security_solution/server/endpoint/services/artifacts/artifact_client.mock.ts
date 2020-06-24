/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ArtifactClient } from './artifact_client';
import { getInternalArtifactMock } from '../../schemas';

export class ArtifactClientMock extends ArtifactClient {
  public getArtifact = jest.fn().mockResolvedValue(getInternalArtifactMock());
  public createArtifact = jest.fn().mockResolvedValue(getInternalArtifactMock());
  public deleteArtifact = jest.fn().mockResolvedValue(getInternalArtifactMock());
}
