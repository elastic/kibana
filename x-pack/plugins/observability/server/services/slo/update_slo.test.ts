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

    expectDeletionOfObsoleteSLOData(slo);
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

    expectDeletionOfObsoleteSLOData(slo);
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

    expectDeletionOfObsoleteSLOData(slo);
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

    expectDeletionOfObsoleteSLOData(slo);
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

  it('removes the obsolete data from the SLO previous revision', async () => {
    const slo = createSLO({
      indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
    });
    mockRepository.findById.mockResolvedValueOnce(slo);

    const newIndicator = createAPMTransactionErrorRateIndicator({ environment: 'production' });
    await updateSLO.execute(slo.id, { indicator: newIndicator });

    expectDeletionOfObsoleteSLOData(slo);
    expect(mockRepository.save).toBeCalledWith(
      expect.objectContaining({
        ...slo,
        indicator: newIndicator,
        revision: 2,
        updatedAt: expect.anything(),
      })
    );
    expectInstallationOfNewSLOTransform();
  });

  function expectInstallationOfNewSLOTransform() {
    expect(mockTransformManager.start).toBeCalled();
    expect(mockTransformManager.install).toBeCalled();
  }

  function expectDeletionOfObsoleteSLOData(originalSlo: SLO) {
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
