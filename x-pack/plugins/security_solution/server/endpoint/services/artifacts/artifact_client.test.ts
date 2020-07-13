/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { ArtifactConstants } from '../../lib/artifacts';
import { getInternalArtifactMock } from '../../schemas/artifacts/saved_objects.mock';
import { getArtifactClientMock } from './artifact_client.mock';
import { ArtifactClient } from './artifact_client';

describe('artifact_client', () => {
  describe('ArtifactClient sanity checks', () => {
    test('can create ArtifactClient', () => {
      const artifactClient = new ArtifactClient(savedObjectsClientMock.create());
      expect(artifactClient).toBeInstanceOf(ArtifactClient);
    });

    test('can get artifact', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const artifactClient = getArtifactClientMock(savedObjectsClient);
      await artifactClient.getArtifact('abcd');
      expect(savedObjectsClient.get).toHaveBeenCalled();
    });

    test('can create artifact', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const artifactClient = getArtifactClientMock(savedObjectsClient);
      const artifact = await getInternalArtifactMock('linux', 'v1');
      await artifactClient.createArtifact(artifact);
      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        ArtifactConstants.SAVED_OBJECT_TYPE,
        artifact,
        { id: artifactClient.getArtifactId(artifact) }
      );
    });

    test('can delete artifact', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const artifactClient = getArtifactClientMock(savedObjectsClient);
      await artifactClient.deleteArtifact('abcd');
      expect(savedObjectsClient.delete).toHaveBeenCalledWith(
        ArtifactConstants.SAVED_OBJECT_TYPE,
        'abcd'
      );
    });
  });
});
