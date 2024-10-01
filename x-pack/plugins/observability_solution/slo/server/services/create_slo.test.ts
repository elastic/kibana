/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateSLO } from './create_slo';
import { fiveMinute, oneMinute } from './fixtures/duration';
import { createAPMTransactionErrorRateIndicator, createSLOParams } from './fixtures/slo';
import {
  createSloContextMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
  SLOContextMock,
} from './mocks';
import { TransformManager } from './transform_manager';

describe('CreateSLO', () => {
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let createSLO: CreateSLO;
  let contextMock: jest.Mocked<SLOContextMock>;

  jest.useFakeTimers().setSystemTime(new Date('2024-01-01'));

  beforeEach(() => {
    contextMock = createSloContextMock();
    mockTransformManager = createTransformManagerMock();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    createSLO = new CreateSLO(contextMock, mockTransformManager, mockSummaryTransformManager);
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

      expect(contextMock.repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...sloParams,
          id: 'unique-id',
          settings: {
            syncDelay: oneMinute(),
            frequency: oneMinute(),
            preventInitialBackfill: false,
          },
          revision: 1,
          tags: [],
          enabled: true,
          version: 2,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );

      expect(mockTransformManager.install).toHaveBeenCalled();
      expect(
        contextMock.scopedClusterClient.asSecondaryAuthUser.ingest.putPipeline.mock.calls[0]
      ).toMatchSnapshot();
      expect(mockSummaryTransformManager.install).toHaveBeenCalled();
      expect(contextMock.esClient.index.mock.calls[0]).toMatchSnapshot();

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

      expect(contextMock.repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...sloParams,
          id: expect.any(String),
          settings: {
            syncDelay: fiveMinute(),
            frequency: oneMinute(),
            preventInitialBackfill: false,
          },
          revision: 1,
          tags: ['one', 'two'],
          enabled: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );
    });

    it('overrides the settings when provided', async () => {
      const sloParams = createSLOParams({
        indicator: createAPMTransactionErrorRateIndicator(),
        tags: ['one', 'two'],
        settings: {
          syncDelay: fiveMinute(),
          frequency: fiveMinute(),
          preventInitialBackfill: true,
        },
      });
      mockTransformManager.install.mockResolvedValue('slo-transform-id');

      await createSLO.execute(sloParams);

      expect(contextMock.repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...sloParams,
          id: expect.any(String),
          settings: {
            syncDelay: fiveMinute(),
            frequency: fiveMinute(),
            preventInitialBackfill: true,
          },
          revision: 1,
          tags: ['one', 'two'],
          enabled: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );
    });
  });

  describe('unhappy path', () => {
    it('rollbacks completed operations when rollup transform install fails', async () => {
      mockTransformManager.install.mockRejectedValue(new Error('Rollup transform install error'));
      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createSLO.execute(sloParams)).rejects.toThrowError(
        'Rollup transform install error'
      );

      expect(contextMock.repository.deleteById).toHaveBeenCalled();
      expect(
        contextMock.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
      ).toHaveBeenCalledTimes(2);

      expect(mockSummaryTransformManager.stop).toHaveBeenCalledTimes(0);
      expect(mockSummaryTransformManager.uninstall).toHaveBeenCalledTimes(1);
      expect(mockTransformManager.stop).toHaveBeenCalledTimes(0);
      expect(mockTransformManager.uninstall).toHaveBeenCalledTimes(1);
    });

    it('rollbacks completed operations when summary transform install fails', async () => {
      mockSummaryTransformManager.install.mockRejectedValue(
        new Error('Summary transform install error')
      );
      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createSLO.execute(sloParams)).rejects.toThrowError(
        'Summary transform install error'
      );

      expect(contextMock.repository.deleteById).toHaveBeenCalled();
      expect(mockTransformManager.stop).not.toHaveBeenCalled();
      expect(mockTransformManager.uninstall).toHaveBeenCalled();
      expect(
        contextMock.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
      ).toHaveBeenCalledTimes(2);
      expect(mockSummaryTransformManager.uninstall).toHaveBeenCalled();

      expect(mockSummaryTransformManager.stop).not.toHaveBeenCalled();
    });

    it('rollbacks completed operations when create temporary document fails', async () => {
      contextMock.esClient.index.mockRejectedValue(new Error('temporary document index failed'));
      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createSLO.execute(sloParams)).rejects.toThrowError(
        'temporary document index failed'
      );

      expect(contextMock.repository.deleteById).toHaveBeenCalled();
      expect(mockTransformManager.stop).not.toHaveBeenCalled();
      expect(mockTransformManager.uninstall).toHaveBeenCalled();
      expect(
        contextMock.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
      ).toHaveBeenCalledTimes(2);
      expect(mockSummaryTransformManager.stop).not.toHaveBeenCalled();
      expect(mockSummaryTransformManager.uninstall).toHaveBeenCalled();
    });
  });
});
