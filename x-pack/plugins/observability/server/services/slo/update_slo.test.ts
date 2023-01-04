/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getSLOTransformId } from '../../assets/constants';
import { SLO } from '../../domain/models';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';
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

  describe('without breaking changes', () => {
    it('updates the SLO saved object without revision bump', async () => {
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });
      mockRepository.findById.mockResolvedValueOnce(slo);

      const newName = 'new slo name';
      const response = await updateSLO.execute(slo.id, { name: newName });

      expectTransformManagerNeverCalled();
      expect(mockEsClient.deleteByQuery).not.toBeCalled();
      expect(mockRepository.save).toBeCalledWith(
        expect.objectContaining({ ...slo, name: newName, updatedAt: expect.anything() })
      );
      expect(response.name).toBe(newName);
      expect(response.updatedAt).not.toBe(slo.updatedAt);
      expect(response.revision).toBe(slo.revision);
    });
  });

  describe('with breaking changes', () => {
    it('consideres settings as a breaking change', async () => {
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
  });

  function expectTransformManagerNeverCalled() {
    expect(mockTransformManager.stop).not.toBeCalled();
    expect(mockTransformManager.uninstall).not.toBeCalled();
    expect(mockTransformManager.start).not.toBeCalled();
    expect(mockTransformManager.install).not.toBeCalled();
  }

  function expectInstallationOfNewSLOTransform() {
    expect(mockTransformManager.start).toBeCalled();
    expect(mockTransformManager.install).toBeCalled();
  }

  function expectDeletionOfObsoleteSLOData(originalSlo: SLO) {
    const transformId = getSLOTransformId(originalSlo.id, originalSlo.revision);
    expect(mockTransformManager.stop).toBeCalledWith(transformId);
    expect(mockTransformManager.uninstall).toBeCalledWith(transformId);
    expect(mockEsClient.deleteByQuery).toBeCalledWith(
      expect.objectContaining({
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
