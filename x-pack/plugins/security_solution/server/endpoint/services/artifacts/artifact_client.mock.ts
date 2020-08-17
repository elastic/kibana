/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { SavedObjectsClientContract } from 'src/core/server';
import { ArtifactClient } from './artifact_client';

export const getArtifactClientMock = (
  savedObjectsClient?: SavedObjectsClientContract
): ArtifactClient => {
  if (savedObjectsClient !== undefined) {
    return new ArtifactClient(savedObjectsClient);
  }
  return new ArtifactClient(savedObjectsClientMock.create());
};
