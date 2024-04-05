/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClientMock,
  elasticsearchServiceMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { CreateSLO } from './create_slo';
import { fiveMinute, oneMinute } from './fixtures/duration';
import { createAPMTransactionErrorRateIndicator, createSLOParams } from './fixtures/slo';
import {
  createSLORepositoryMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
} from './mocks';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

describe('CreateSLO', () => {
  let esClientMock: ElasticsearchClientMock;
  let loggerMock: jest.Mocked<MockedLogger>;
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let createSLO: CreateSLO;

  jest.useFakeTimers().setSystemTime(new Date('2024-01-01'));

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    loggerMock = loggingSystemMock.createLogger();
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    createSLO = new CreateSLO(
      esClientMock,
      mockRepository,
      mockTransformManager,
      mockSummaryTransformManager,
      loggerMock,
      'some-space',
      httpServiceMock.createStartContract().basePath
    );
  });

  describe('happy path', () => {
    it('calls the expected services', async () => {
      const sloParams = createSLOParams({
        id: 'unique-id',
        indicator: createAPMTransactionErrorRateIndicator(),
      });
      mockTransformManager.install.mockResolvedValue('slo-id-revision');
      mockSummaryTransformManager.install.mockResolvedValue('slo-summary-id-revision');

      const response = await createSLO.execute(sloParams);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...sloParams,
          id: 'unique-id',
          settings: {
            syncDelay: oneMinute(),
            frequency: oneMinute(),
          },
          revision: 1,
          tags: [],
          enabled: true,
          version: 2,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
        { throwOnConflict: true }
      );

      expect(mockTransformManager.install).toHaveBeenCalled();
      expect(mockTransformManager.start).toHaveBeenCalled();
      expect(esClientMock.ingest.putPipeline.mock.calls[0]).toMatchSnapshot();
      expect(mockSummaryTransformManager.install).toHaveBeenCalled();
      expect(mockSummaryTransformManager.start).toHaveBeenCalled();
      expect(esClientMock.index.mock.calls[0]).toMatchSnapshot();

      expect(response).toEqual(expect.objectContaining({ id: 'unique-id' }));
    });

    it('overrides the default values when provided', async () => {
      const sloParams = createSLOParams({
        indicator: createAPMTransactionErrorRateIndicator(),
        tags: ['one', 'two'],
        settings: {
          syncDelay: fiveMinute(),
        },
      });
      mockTransformManager.install.mockResolvedValue('slo-transform-id');

      await createSLO.execute(sloParams);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...sloParams,
          id: expect.any(String),
          settings: {
            syncDelay: fiveMinute(),
            frequency: oneMinute(),
          },
          revision: 1,
          tags: ['one', 'two'],
          enabled: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
        { throwOnConflict: true }
      );
    });
  });

  describe('unhappy path', () => {
    it('rollbacks new resources on failure', async () => {
      mockTransformManager.install.mockRejectedValue(new Error('Rollup transform install error'));
      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createSLO.execute(sloParams)).rejects.toThrowError(
        'Rollup transform install error'
      );

      expect(mockSummaryTransformManager.stop).toHaveBeenCalled();
      expect(mockSummaryTransformManager.uninstall).toHaveBeenCalled();
      expect(mockTransformManager.stop).toHaveBeenCalled();
      expect(mockTransformManager.uninstall).toHaveBeenCalled();
      expect(esClientMock.ingest.deletePipeline).toHaveBeenCalled();
      expect(mockRepository.deleteById).toHaveBeenCalled();
    });
  });
});
