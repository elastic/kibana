/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';

import {
  getSLOTransformId,
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_MODEL_VERSION,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../assets/constants';
import { createSLO } from './fixtures/slo';
import {
  createSLORepositoryMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
} from './mocks';
import { ResetSLO } from './reset_slo';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

describe('ResetSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let loggerMock: jest.Mocked<MockedLogger>;
  let resetSLO: ResetSLO;

  beforeEach(() => {
    loggerMock = loggingSystemMock.createLogger();
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    resetSLO = new ResetSLO(
      mockEsClient,
      mockRepository,
      mockTransformManager,
      mockSummaryTransformManager,
      loggerMock
    );
  });

  it('resets the SLO', async () => {
    const slo = createSLO({ version: 1 });
    mockRepository.findById.mockResolvedValueOnce(slo);
    mockRepository.save.mockImplementation((v) => Promise.resolve(v));

    await resetSLO.execute(slo.id);

    const transformId = getSLOTransformId(slo.id, slo.revision);
    expect(mockTransformManager.stop).toBeCalledWith(transformId);
    expect(mockTransformManager.uninstall).toBeCalledWith(transformId);

    expect(mockEsClient.deleteByQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        index: SLO_DESTINATION_INDEX_PATTERN,
        query: {
          bool: {
            filter: [{ term: { 'slo.id': slo.id } }],
          },
        },
      })
    );
    expect(mockEsClient.deleteByQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
        query: {
          bool: {
            filter: [{ term: { 'slo.id': slo.id } }],
          },
        },
      })
    );

    expect(mockTransformManager.install).toBeCalledWith(slo);
    expect(mockTransformManager.preview).toBeCalledWith(transformId);
    expect(mockTransformManager.start).toBeCalledWith(transformId);

    expect(mockRepository.save).toHaveBeenCalledWith({
      ...slo,
      version: SLO_MODEL_VERSION,
      updatedAt: expect.anything(),
    });
  });
});
