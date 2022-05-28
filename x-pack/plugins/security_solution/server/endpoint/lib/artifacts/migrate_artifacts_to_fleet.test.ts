/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loggingSystemMock,
  savedObjectsClientMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import {
  Logger,
  SavedObjectsClient,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from '@kbn/core/server';
import { migrateArtifactsToFleet } from './migrate_artifacts_to_fleet';
import { createEndpointArtifactClientMock } from '../../services/artifacts/mocks';
import { InternalArtifactCompleteSchema } from '../../schemas';
import { generateArtifactEsGetSingleHitMock } from '@kbn/fleet-plugin/server/services/artifacts/mocks';
import { NewArtifact } from '@kbn/fleet-plugin/server/services';
import { CreateRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

describe('When migrating artifacts to fleet', () => {
  let soClient: jest.Mocked<SavedObjectsClient>;
  let logger: jest.Mocked<Logger>;
  let artifactClient: ReturnType<typeof createEndpointArtifactClientMock>;
  /** An artifact that was created prior to 7.14 */
  let soArtifactEntry: InternalArtifactCompleteSchema;

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
    // pre-v7.14 artifact, which is compressed
    soArtifactEntry = {
      identifier: 'endpoint-exceptionlist-macos-v1',
      compressionAlgorithm: 'zlib',
      encryptionAlgorithm: 'none',
      decodedSha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
      encodedSha256: 'f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda',
      decodedSize: 14,
      encodedSize: 22,
      body: 'eJyrVkrNKynKTC1WsoqOrQUAJxkFKQ==',
    };

    // Mock the esClient create response to include the artifact properties that were provide
    // to it by fleet artifact client
    artifactClient._esClient.create.mockImplementation(<T>(props: CreateRequest<T>) => {
      return elasticsearchServiceMock.createSuccessTransportRequestPromise({
        ...generateArtifactEsGetSingleHitMock({
          ...((props?.body ?? {}) as NewArtifact),
        }),
        _index: '.fleet-artifacts-7',
        _id: `endpoint:endpoint-exceptionlist-macos-v1-${
          // @ts-expect-error TS2339
          props?.body?.decodedSha256 ?? 'UNKNOWN?'
        }`,
        _version: 1,
        result: 'created',
        _shards: {
          total: 1,
          successful: 1,
          failed: 0,
        },
        _seq_no: 0,
        _primary_term: 1,
      });
    });

    soClient.find.mockResolvedValue(createSoFindResult([], 0)).mockResolvedValueOnce(
      createSoFindResult([
        {
          score: 1,
          type: '',
          id: 'abc123',
          references: [],
          attributes: soArtifactEntry,
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

  it('should create artifact in fleet with attributes that match the SO version', async () => {
    await migrateArtifactsToFleet(soClient, artifactClient, logger);

    await expect(artifactClient.createArtifact.mock.results[0].value).resolves.toEqual(
      expect.objectContaining({
        ...soArtifactEntry,
        compressionAlgorithm: 'zlib',
      })
    );
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
