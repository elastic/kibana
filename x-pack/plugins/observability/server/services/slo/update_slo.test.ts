/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import {
  getSLOTransformId,
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../assets/constants';
import { SLO } from '../../domain/models';
import { fiveMinute, oneMinute } from './fixtures/duration';
import {
  createAPMTransactionErrorRateIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from './fixtures/slo';
import { createSLORepositoryMock, createTransformManagerMock } from './mocks';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';
import { UpdateSLO } from './update_slo';

describe('UpdateSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let updateSLO: UpdateSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    updateSLO = new UpdateSLO(mockRepository, mockTransformManager, mockEsClient);
  });

  it('updates the settings correctly', async () => {
    const slo = createSLO();
    mockRepository.findById.mockResolvedValueOnce(slo);

    const newSettings = { ...slo.settings, timestamp_field: 'newField' };
    await updateSLO.execute(slo.id, { settings: newSettings });

    expectDeletionOfOriginalSLO(slo);
    expect(mockRepository.save).toBeCalledWith(
      expect.objectContaining({
        ...slo,
        settings: newSettings,
        revision: 2,
        updatedAt: expect.anything(),
      })
    );
    expectInstallationOfNewSLOTransform();
  });

  it('updates the budgeting method correctly', async () => {
    const slo = createSLO({ budgetingMethod: 'occurrences' });
    mockRepository.findById.mockResolvedValueOnce(slo);

    await updateSLO.execute(slo.id, {
      budgetingMethod: 'timeslices',
      objective: {
        target: slo.objective.target,
        timesliceTarget: 0.9,
        timesliceWindow: oneMinute(),
      },
    });

    expectDeletionOfOriginalSLO(slo);
    expectInstallationOfNewSLOTransform();
  });

  it('updates the timeslice target correctly', async () => {
    const slo = createSLOWithTimeslicesBudgetingMethod();
    mockRepository.findById.mockResolvedValueOnce(slo);

    await updateSLO.execute(slo.id, {
      objective: {
        target: slo.objective.target,
        timesliceTarget: 0.1,
        timesliceWindow: slo.objective.timesliceWindow,
      },
    });

    expectDeletionOfOriginalSLO(slo);
    expectInstallationOfNewSLOTransform();
  });

  it('consideres a timeslice window change as a breaking change', async () => {
    const slo = createSLOWithTimeslicesBudgetingMethod();
    mockRepository.findById.mockResolvedValueOnce(slo);

    await updateSLO.execute(slo.id, {
      objective: {
        target: slo.objective.target,
        timesliceTarget: slo.objective.timesliceTarget,
        timesliceWindow: fiveMinute(),
      },
    });

    expectDeletionOfOriginalSLO(slo);
    expectInstallationOfNewSLOTransform();
  });

  it('index a temporary summary document', async () => {
    const slo = createSLO({
      id: 'unique-id',
      indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
    });
    mockRepository.findById.mockResolvedValueOnce(slo);

    const newIndicator = createAPMTransactionErrorRateIndicator({ environment: 'production' });
    await updateSLO.execute(slo.id, { indicator: newIndicator });

    expect(mockEsClient.index.mock.calls[0]).toMatchSnapshot();
  });

  it('removes the original data from the original SLO', async () => {
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
    });
    mockRepository.findById.mockResolvedValueOnce(slo);

    const newIndicator = createAPMTransactionErrorRateIndicator({ environment: 'production' });
    await updateSLO.execute(slo.id, { indicator: newIndicator });

    expect(mockRepository.save).toBeCalledWith(
      expect.objectContaining({
        ...slo,
        indicator: newIndicator,
        revision: 2,
        updatedAt: expect.anything(),
      })
    );
    expectInstallationOfNewSLOTransform();
    expectDeletionOfOriginalSLO(slo);
  });

  describe('when error happens during the transform installation step', () => {
    it('restores the previous SLO definition in the repository', async () => {
      const slo = createSLO({
        indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
      });
      mockRepository.findById.mockResolvedValueOnce(slo);
      mockTransformManager.install.mockRejectedValueOnce(new Error('Transform install error'));

      const newIndicator = createAPMTransactionErrorRateIndicator({ environment: 'production' });

      await expect(updateSLO.execute(slo.id, { indicator: newIndicator })).rejects.toThrowError(
        'Transform install error'
      );

      expect(mockRepository.save).toHaveBeenCalledWith(slo);
      expect(mockTransformManager.preview).not.toHaveBeenCalled();
      expect(mockTransformManager.start).not.toHaveBeenCalled();
      expect(mockTransformManager.stop).not.toHaveBeenCalled();
      expect(mockTransformManager.uninstall).not.toHaveBeenCalled();
      expect(mockEsClient.deleteByQuery).not.toHaveBeenCalled();
    });
  });

  describe('when error happens during the transform start step', () => {
    it('removes the new transform and restores the previous SLO definition in the repository', async () => {
      const slo = createSLO({
        indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
      });
      mockRepository.findById.mockResolvedValueOnce(slo);
      mockTransformManager.start.mockRejectedValueOnce(new Error('Transform start error'));

      const newIndicator = createAPMTransactionErrorRateIndicator({ environment: 'production' });

      await expect(updateSLO.execute(slo.id, { indicator: newIndicator })).rejects.toThrowError(
        'Transform start error'
      );

      expect(mockTransformManager.uninstall).toHaveBeenCalledWith(
        getSLOTransformId(slo.id, slo.revision + 1)
      );
      expect(mockRepository.save).toHaveBeenCalledWith(slo);
      expect(mockTransformManager.stop).not.toHaveBeenCalled();
      expect(mockEsClient.deleteByQuery).not.toHaveBeenCalled();
    });
  });

  function expectInstallationOfNewSLOTransform() {
    expect(mockTransformManager.install).toBeCalled();
    expect(mockTransformManager.preview).toBeCalled();
    expect(mockTransformManager.start).toBeCalled();
  }

  function expectDeletionOfOriginalSLO(originalSlo: SLO) {
    const transformId = getSLOTransformId(originalSlo.id, originalSlo.revision);
    expect(mockTransformManager.stop).toBeCalledWith(transformId);
    expect(mockTransformManager.uninstall).toBeCalledWith(transformId);

    expect(mockEsClient.deleteByQuery).toHaveBeenCalledTimes(2);
    expect(mockEsClient.deleteByQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        index: SLO_DESTINATION_INDEX_PATTERN,
        query: {
          bool: {
            filter: [
              { term: { 'slo.id': originalSlo.id } },
              { term: { 'slo.revision': originalSlo.revision } },
            ],
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
            filter: [
              { term: { 'slo.id': originalSlo.id } },
              { term: { 'slo.revision': originalSlo.revision } },
            ],
          },
        },
      })
    );
  }
});
