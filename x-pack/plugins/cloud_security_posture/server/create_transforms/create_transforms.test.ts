/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createTransformIfNotExists, startTransformIfNotStarted } from './create_transforms';
import { latestFindingsTransform } from './latest_findings_transform';

const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;

describe('createTransformIfNotExist', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    jest.resetAllMocks();
  });

  it('expect not to create if already exists', async () => {
    mockEsClient.transform.getTransform.mockResolvedValue({ transforms: [], count: 1 });
    await createTransformIfNotExists(mockEsClient, latestFindingsTransform, logger);
    expect(mockEsClient.transform.getTransform).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.getTransform).toHaveBeenCalledWith({
      transform_id: latestFindingsTransform.transform_id,
    });
    expect(mockEsClient.transform.putTransform).toHaveBeenCalledTimes(0);
  });

  it('expect to create if does not already exist', async () => {
    mockEsClient.transform.getTransform.mockRejectedValue({ statusCode: 404 });
    await createTransformIfNotExists(mockEsClient, latestFindingsTransform, logger);
    expect(mockEsClient.transform.getTransform).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.getTransform).toHaveBeenCalledWith({
      transform_id: latestFindingsTransform.transform_id,
    });
    expect(mockEsClient.transform.putTransform).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.putTransform).toHaveBeenCalledWith(latestFindingsTransform);
  });

  it('expect not to create if get error is not 404', async () => {
    mockEsClient.transform.getTransform.mockRejectedValue({ statusCode: 400 });
    await createTransformIfNotExists(mockEsClient, latestFindingsTransform, logger);
    expect(mockEsClient.transform.getTransform).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.putTransform).toHaveBeenCalledTimes(0);
  });
});

function getTransformWithState(state: string) {
  return {
    state,
    checkpointing: { last: { checkpoint: 1 } },
    id: '',
    stats: {
      documents_indexed: 0,
      documents_processed: 0,
      exponential_avg_checkpoint_duration_ms: 0,
      exponential_avg_documents_indexed: 0,
      exponential_avg_documents_processed: 0,
      index_failures: 0,
      index_time_in_ms: 0,
      index_total: 0,
      pages_processed: 0,
      processing_time_in_ms: 0,
      processing_total: 0,
      search_failures: 0,
      search_time_in_ms: 0,
      search_total: 0,
      trigger_count: 0,
    },
  };
}

describe('startTransformIfNotStarted', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    jest.resetAllMocks();
  });

  ['failed', 'stopping', 'started', 'aborting', 'indexing'].forEach((state) =>
    it(`expect not to start if state is ${state}`, async () => {
      mockEsClient.transform.getTransformStats.mockResolvedValue({
        transforms: [getTransformWithState(state)],
        count: 1,
      });
      await startTransformIfNotStarted(mockEsClient, latestFindingsTransform.transform_id, logger);
      expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledTimes(1);
      expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledWith({
        transform_id: latestFindingsTransform.transform_id,
      });
      expect(mockEsClient.transform.startTransform).toHaveBeenCalledTimes(0);
    })
  );

  it('expect not to start if transform not found', async () => {
    mockEsClient.transform.getTransformStats.mockResolvedValue({
      transforms: [],
      count: 0,
    });
    await startTransformIfNotStarted(mockEsClient, latestFindingsTransform.transform_id, logger);
    expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledWith({
      transform_id: latestFindingsTransform.transform_id,
    });
    expect(mockEsClient.transform.startTransform).toHaveBeenCalledTimes(0);
  });

  it('expect to start if state is stopped', async () => {
    mockEsClient.transform.getTransformStats.mockResolvedValue({
      transforms: [getTransformWithState('stopped')],
      count: 1,
    });
    await startTransformIfNotStarted(mockEsClient, latestFindingsTransform.transform_id, logger);
    expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.getTransformStats).toHaveBeenCalledWith({
      transform_id: latestFindingsTransform.transform_id,
    });
    expect(mockEsClient.transform.startTransform).toHaveBeenCalledTimes(1);
    expect(mockEsClient.transform.startTransform).toHaveBeenCalledWith({
      transform_id: latestFindingsTransform.transform_id,
    });
  });
});
