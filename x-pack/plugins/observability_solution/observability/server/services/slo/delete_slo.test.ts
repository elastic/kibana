/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { DeleteSLO } from './delete_slo';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';
import {
  createSLORepositoryMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
} from './mocks';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

describe('DeleteSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockRulesClient: jest.Mocked<RulesClientApi>;
  let deleteSLO: DeleteSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockRulesClient = rulesClientMock.create();
    deleteSLO = new DeleteSLO(
      mockRepository,
      mockTransformManager,
      mockSummaryTransformManager,
      mockEsClient,
      mockRulesClient
    );
  });

  describe('happy path', () => {
    it('removes all resources associatde to the slo', async () => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createAPMTransactionErrorRateIndicator(),
      });
      mockRepository.findById.mockResolvedValueOnce(slo);

      await deleteSLO.execute(slo.id);

      expect(mockRepository.findById).toMatchSnapshot();
      expect(mockSummaryTransformManager.stop).toMatchSnapshot();
      expect(mockSummaryTransformManager.uninstall).toMatchSnapshot();
      expect(mockTransformManager.stop).toMatchSnapshot();
      expect(mockTransformManager.uninstall).toMatchSnapshot();
      expect(mockEsClient.ingest.deletePipeline).toMatchSnapshot();
      expect(mockEsClient.deleteByQuery).toMatchSnapshot();
      expect(mockRulesClient.bulkDeleteRules).toMatchSnapshot();
      expect(mockRepository.deleteById).toMatchSnapshot();
    });
  });
});
