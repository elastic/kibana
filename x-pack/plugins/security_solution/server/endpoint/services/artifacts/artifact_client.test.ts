/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { ArtifactConstants, getArtifactId } from '../../lib/artifacts';
import { getInternalArtifactMock } from '../../schemas/artifacts/saved_objects.mock';
import { ArtifactClient } from './artifact_client';

describe('artifact_client', () => {
  describe('ArtifactClient sanity checks', () => {
    test('can create ArtifactClient', () => {
      const artifactClient = new ArtifactClient(savedObjectsClientMock.create());
      expect(artifactClient).toBeInstanceOf(ArtifactClient);
    });

    test('can get artifact', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const artifactClient = new ArtifactClient(savedObjectsClient);
      await artifactClient.getArtifact('abcd');
      expect(savedObjectsClient.get).toHaveBeenCalled();
    });

    test('can create artifact', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const artifactClient = new ArtifactClient(savedObjectsClient);
      const artifact = await getInternalArtifactMock('linux', 'v1');
      await artifactClient.createArtifact(artifact);
      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        ArtifactConstants.SAVED_OBJECT_TYPE,
        {
          ...artifact,
          created: expect.any(Number),
        },
        { id: getArtifactId(artifact) }
      );
    });

    test('can delete artifact', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const artifactClient = new ArtifactClient(savedObjectsClient);
      await artifactClient.deleteArtifact('abcd');
      expect(savedObjectsClient.delete).toHaveBeenCalledWith(
        ArtifactConstants.SAVED_OBJECT_TYPE,
        'abcd'
      );
    });
  });
});
