/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loggingSystemMock,
  savedObjectsClientMock,
} from '../../../../../../../src/core/server/mocks';
import {
  Logger,
  SavedObjectsClient,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from 'kibana/server';
import { migrateArtifactsToFleet } from './migrate_artifacts_to_fleet';
import { createEndpointArtifactClientMock } from '../../services/artifacts/mocks';
import { getInternalArtifactMock } from '../../schemas/artifacts/saved_objects.mock';

describe('When migrating artifacts to fleet', () => {
  let soClient: jest.Mocked<SavedObjectsClient>;
  let logger: jest.Mocked<Logger>;
  let artifactClient: ReturnType<typeof createEndpointArtifactClientMock>;

  const createSoFindResult = (
    soHits: SavedObjectsFindResult[] = [],
    total: number = 15,
    page: number = 1
  ): SavedObjectsFindResponse => {
    return {
      total,
      page,
      per_page: 10,
      saved_objects: soHits,
    };
  };

  beforeEach(async () => {
    soClient = savedObjectsClientMock.create() as jest.Mocked<SavedObjectsClient>;
    logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
    artifactClient = createEndpointArtifactClientMock();

    soClient.find.mockResolvedValue(createSoFindResult([], 0)).mockResolvedValueOnce(
      createSoFindResult([
        {
          score: 1,
          type: '',
          id: 'abc123',
          references: [],
          attributes: await getInternalArtifactMock('windows', 'v1'),
        },
      ])
    );
  });

  it('should do nothing if there are no artifacts', async () => {
    soClient.find.mockReset();
    soClient.find.mockResolvedValue(createSoFindResult([], 0));
    await migrateArtifactsToFleet(soClient, artifactClient, logger);
    expect(soClient.find).toHaveBeenCalled();
    expect(artifactClient.createArtifact).not.toHaveBeenCalled();
    expect(soClient.delete).not.toHaveBeenCalled();
  });

  it('should create new artifact via fleet client and delete prior SO one', async () => {
    await migrateArtifactsToFleet(soClient, artifactClient, logger);
    expect(artifactClient.createArtifact).toHaveBeenCalled();
    expect(soClient.delete).toHaveBeenCalled();
  });

  it('should ignore 404 responses for SO delete (multi-node kibana setup)', async () => {
    const notFoundError: Error & { output?: { statusCode: number } } = new Error('not found');
    notFoundError.output = { statusCode: 404 };
    soClient.delete.mockRejectedValue(notFoundError);
    await expect(migrateArtifactsToFleet(soClient, artifactClient, logger)).resolves.toEqual(
      undefined
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Artifact Migration: Attempt to delete Artifact SO [abc123] returned 404'
    );
  });

  it('should Throw() and log error if migration fails', async () => {
    const error = new Error('test: delete failed');
    soClient.delete.mockRejectedValue(error);
    await expect(migrateArtifactsToFleet(soClient, artifactClient, logger)).rejects.toThrow(
      'Artifact SO migration failed'
    );
  });
});
