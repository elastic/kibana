/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeleteSLO } from './delete_slo';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';
import {
  createSloContextMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
  SLOContextMock,
} from './mocks';
import { TransformManager } from './transform_manager';

describe('DeleteSLO', () => {
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let deleteSLO: DeleteSLO;
  let contextMock: jest.Mocked<SLOContextMock>;

  beforeEach(() => {
    contextMock = createSloContextMock();
    mockTransformManager = createTransformManagerMock();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    deleteSLO = new DeleteSLO(contextMock, mockTransformManager, mockSummaryTransformManager);
  });

  describe('happy path', () => {
    it('removes all resources associate to the slo', async () => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createAPMTransactionErrorRateIndicator(),
      });
      contextMock.repository.findById.mockResolvedValueOnce(slo);

      await deleteSLO.execute(slo.id);

      expect(contextMock.repository.findById).toMatchSnapshot();
      expect(mockSummaryTransformManager.stop).toMatchSnapshot();
      expect(mockSummaryTransformManager.uninstall).toMatchSnapshot();
      expect(mockTransformManager.stop).toMatchSnapshot();
      expect(mockTransformManager.uninstall).toMatchSnapshot();
      expect(
        contextMock.scopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
      ).toMatchSnapshot();
      expect(contextMock.esClient.ingest.deletePipeline).toMatchSnapshot();
      expect(contextMock.esClient.deleteByQuery).toMatchSnapshot();
      expect(contextMock.rulesClient.bulkDeleteRules).toMatchSnapshot();
      expect(contextMock.repository.deleteById).toMatchSnapshot();
    });
  });
});
