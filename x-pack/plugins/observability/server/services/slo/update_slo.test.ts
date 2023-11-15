/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { UpdateSLOParams } from '@kbn/slo-schema';
import { cloneDeep, omit, pick } from 'lodash';

import {
  getSLOTransformId,
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../assets/constants';
import { SLO } from '../../domain/models';
import { fiveMinute, oneMinute, twoMinute } from './fixtures/duration';
import {
  createAPMTransactionErrorRateIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
  createMetricCustomIndicator,
} from './fixtures/slo';
import { thirtyDaysRolling } from './fixtures/time_window';
import { createSLORepositoryMock, createTransformManagerMock } from './mocks';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';
import { UpdateSLO } from './update_slo';

describe('UpdateSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockSystemEsClient: jest.Mocked<ElasticsearchClient>;
  let updateSLO: UpdateSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockSystemEsClient = elasticsearchServiceMock.createElasticsearchClient();
    updateSLO = new UpdateSLO(
      mockRepository,
      mockTransformManager,
      mockEsClient,
      mockSystemEsClient
    );
  });

  describe('when the update payload does not change the original SLO', () => {
    it('returns early with a full identical SLO payload', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = omit(cloneDeep(slo), [
        'id',
        'revision',
        'createdAt',
        'updatedAt',
        'enabled',
      ]);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical name', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['name']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical indicator', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['indicator']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical timeWindow', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['timeWindow']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical budgetingMethod', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['budgetingMethod']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical description', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['description']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical groupBy', async () => {
      const slo = createSLO({ groupBy: 'project.id' });
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['groupBy']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical objective', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['objective']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical tags', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['tags']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });

    it('returns early with identical settings', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);
      const updatePayload: UpdateSLOParams = pick(cloneDeep(slo), ['settings']);

      await updateSLO.execute(slo.id, updatePayload);

      expectNoCallsToAnyMocks();
    });
  });

  it("bumps the revision when changing 'settings'", async () => {
    const slo = createSLO();
    mockRepository.findById.mockResolvedValueOnce(slo);
    const newSettings = {
      syncDelay: twoMinute(),
      frequency: fiveMinute(),
    };

    await updateSLO.execute(slo.id, { settings: newSettings });

    expectDeletionOfOriginalSLO(slo);
    expect(mockRepository.save).toBeCalledWith(
      expect.objectContaining({
        ...slo,
        settings: newSettings,
        revision: slo.revision + 1,
        updatedAt: expect.anything(),
      })
    );
    expectInstallationOfNewSLOTransform();
  });

  it("bumps the revision when changing 'budgetingMethod'", async () => {
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
    expect(mockRepository.save).toBeCalledWith(
      expect.objectContaining({
        ...slo,
        budgetingMethod: 'timeslices',
        objective: {
          target: slo.objective.target,
          timesliceTarget: 0.9,
          timesliceWindow: oneMinute(),
        },
        revision: slo.revision + 1,
        updatedAt: expect.anything(),
      })
    );
    expectInstallationOfNewSLOTransform();
  });

  it("bumps the revision when changing 'objective.timesliceTarget'", async () => {
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
    expect(mockRepository.save).toBeCalledWith(
      expect.objectContaining({
        ...slo,
        objective: {
          target: slo.objective.target,
          timesliceTarget: 0.1,
          timesliceWindow: slo.objective.timesliceWindow,
        },
        revision: slo.revision + 1,
        updatedAt: expect.anything(),
      })
    );
    expectInstallationOfNewSLOTransform();
  });

  it("bumps the revision when changing 'objective.timesliceWindow'", async () => {
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
    expect(mockRepository.save).toBeCalledWith(
      expect.objectContaining({
        ...slo,
        objective: {
          target: slo.objective.target,
          timesliceTarget: slo.objective.timesliceTarget,
          timesliceWindow: fiveMinute(),
        },
        revision: slo.revision + 1,
        updatedAt: expect.anything(),
      })
    );
    expectInstallationOfNewSLOTransform();
  });

  it("bumps the revision when changing 'objective'", async () => {
    const slo = createSLO();
    mockRepository.findById.mockResolvedValueOnce(slo);

    await updateSLO.execute(slo.id, {
      objective: {
        target: 0.5,
      },
    });

    expectDeletionOfOriginalSLO(slo);
    expect(mockRepository.save).toBeCalledWith(
      expect.objectContaining({
        ...slo,
        objective: {
          target: 0.5,
        },
        revision: slo.revision + 1,
        updatedAt: expect.anything(),
      })
    );
    expectInstallationOfNewSLOTransform();
  });

  it("bumps the revision when changing 'timeWindow'", async () => {
    const slo = createSLO();
    mockRepository.findById.mockResolvedValueOnce(slo);

    await updateSLO.execute(slo.id, {
      timeWindow: thirtyDaysRolling(),
    });

    expectDeletionOfOriginalSLO(slo);
    expect(mockRepository.save).toBeCalledWith(
      expect.objectContaining({
        ...slo,
        timeWindow: thirtyDaysRolling(),
        revision: slo.revision + 1,
        updatedAt: expect.anything(),
      })
    );
    expectInstallationOfNewSLOTransform();
  });

  it("bumps the revision when changing 'groupBy'", async () => {
    const slo = createSLO({ groupBy: 'labels.projectId' });
    mockRepository.findById.mockResolvedValueOnce(slo);

    await updateSLO.execute(slo.id, {
      groupBy: '*',
    });

    expectDeletionOfOriginalSLO(slo);
    expect(mockRepository.save).toBeCalledWith(
      expect.objectContaining({
        ...slo,
        groupBy: '*',
        revision: slo.revision + 1,
        updatedAt: expect.anything(),
      })
    );
    expectInstallationOfNewSLOTransform();
  });

  it("bumps the revision when changing 'indicator'", async () => {
    const slo = createSLO();
    mockRepository.findById.mockResolvedValueOnce(slo);

    await updateSLO.execute(slo.id, {
      indicator: createMetricCustomIndicator(),
    });

    expectDeletionOfOriginalSLO(slo);
    expect(mockRepository.save).toBeCalledWith(
      expect.objectContaining({
        ...slo,
        indicator: createMetricCustomIndicator(),
        revision: slo.revision + 1,
        updatedAt: expect.anything(),
      })
    );
    expectInstallationOfNewSLOTransform();
  });

  describe('when the revision does not bump', () => {
    it('stores the updated SLO', async () => {
      const slo = createSLO();
      mockRepository.findById.mockResolvedValueOnce(slo);

      await updateSLO.execute(slo.id, {
        name: 'a new name',
        description: 'a new description',
        tags: ['some', 'new tags'],
      });

      expect(mockRepository.save).toBeCalledWith(
        expect.objectContaining({
          ...slo,
          name: 'a new name',
          description: 'a new description',
          tags: ['some', 'new tags'],
          revision: slo.revision,
          updatedAt: expect.anything(),
        })
      );
      expectNoCallsToAnyMocks();
    });
  });

  describe('when the revision bumps', () => {
    it('indexes a temporary summary document', async () => {
      const slo = createSLO({
        id: 'unique-id',
        indicator: createAPMTransactionErrorRateIndicator({ environment: 'development' }),
      });
      mockRepository.findById.mockResolvedValueOnce(slo);

      const newIndicator = createAPMTransactionErrorRateIndicator({ environment: 'production' });
      await updateSLO.execute(slo.id, { indicator: newIndicator });

      expect(mockEsClient.index.mock.calls[0]).toMatchSnapshot();
      expect(mockSystemEsClient.enrich.executePolicy).toBeCalled();
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
      expect(mockSystemEsClient.enrich.executePolicy).toHaveBeenCalled();
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
      expect(mockSystemEsClient.enrich.executePolicy).toHaveBeenCalled();
      expect(mockTransformManager.stop).not.toHaveBeenCalled();
      expect(mockEsClient.deleteByQuery).not.toHaveBeenCalled();
    });
  });

  function expectNoCallsToAnyMocks() {
    expect(mockTransformManager.stop).not.toBeCalled();
    expect(mockTransformManager.uninstall).not.toBeCalled();
    expect(mockTransformManager.install).not.toBeCalled();
    expect(mockTransformManager.preview).not.toBeCalled();
    expect(mockTransformManager.start).not.toBeCalled();
    expect(mockEsClient.deleteByQuery).not.toBeCalled();
  }

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
