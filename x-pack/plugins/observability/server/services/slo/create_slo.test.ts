/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { CreateSLO } from './create_slo';
import { fiveMinute, oneMinute } from './fixtures/duration';
import { createAPMTransactionErrorRateIndicator, createSLOParams } from './fixtures/slo';
import { createSLORepositoryMock, createTransformManagerMock } from './mocks';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

describe('CreateSLO', () => {
  let esClientMock: ElasticsearchClientMock;
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let createSLO: CreateSLO;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    createSLO = new CreateSLO(esClientMock, mockRepository, mockTransformManager);
  });

  describe('happy path', () => {
    it('calls the expected services', async () => {
      const sloParams = createSLOParams({
        id: 'unique-id',
        indicator: createAPMTransactionErrorRateIndicator(),
      });
      mockTransformManager.install.mockResolvedValue('slo-transform-id');

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
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
        { throwOnConflict: true }
      );
      expect(mockTransformManager.install).toHaveBeenCalledWith(
        expect.objectContaining({ ...sloParams, id: 'unique-id' })
      );
      expect(mockTransformManager.start).toHaveBeenCalledWith('slo-transform-id');
      expect(response).toEqual(expect.objectContaining({ id: 'unique-id' }));
      expect(esClientMock.index.mock.calls[0]).toMatchSnapshot();
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
    it('deletes the SLO when transform installation fails', async () => {
      mockTransformManager.install.mockRejectedValue(new Error('Transform install error'));
      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createSLO.execute(sloParams)).rejects.toThrowError('Transform install error');
      expect(mockRepository.deleteById).toBeCalled();
    });

    it('removes the transform and deletes the SLO when transform start fails', async () => {
      mockTransformManager.install.mockResolvedValue('slo-transform-id');
      mockTransformManager.start.mockRejectedValue(new Error('Transform start error'));
      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createSLO.execute(sloParams)).rejects.toThrowError('Transform start error');
      expect(mockTransformManager.uninstall).toBeCalledWith('slo-transform-id');
      expect(mockRepository.deleteById).toBeCalled();
    });
  });
});
