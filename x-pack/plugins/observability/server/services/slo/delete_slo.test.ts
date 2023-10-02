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
import {
  getSLOTransformId,
  SLO_DESTINATION_INDEX_PATTERN,
  SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../assets/constants';
import { DeleteSLO } from './delete_slo';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';
import { createSLORepositoryMock, createTransformManagerMock } from './mocks';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

describe('DeleteSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockRulesClient: jest.Mocked<RulesClientApi>;
  let deleteSLO: DeleteSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockRulesClient = rulesClientMock.create();
    deleteSLO = new DeleteSLO(mockRepository, mockTransformManager, mockEsClient, mockRulesClient);
  });

  describe('happy path', () => {
    it('removes the transform, the roll up data, the associated rules and the SLO from the repository', async () => {
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });
      mockRepository.findById.mockResolvedValueOnce(slo);

      await deleteSLO.execute(slo.id);

      expect(mockRepository.findById).toHaveBeenCalledWith(slo.id);
      expect(mockTransformManager.stop).toHaveBeenCalledWith(
        getSLOTransformId(slo.id, slo.revision)
      );
      expect(mockTransformManager.uninstall).toHaveBeenCalledWith(
        getSLOTransformId(slo.id, slo.revision)
      );
      expect(mockEsClient.deleteByQuery).toHaveBeenCalledTimes(2);
      expect(mockEsClient.deleteByQuery).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          index: SLO_DESTINATION_INDEX_PATTERN,
          query: {
            match: {
              'slo.id': slo.id,
            },
          },
        })
      );
      expect(mockEsClient.deleteByQuery).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
          query: {
            match: {
              'slo.id': slo.id,
            },
          },
        })
      );
      expect(mockRulesClient.bulkDeleteRules).toHaveBeenCalledWith({
        filter: `alert.attributes.params.sloId:${slo.id}`,
      });
      expect(mockRepository.deleteById).toHaveBeenCalledWith(slo.id);
    });
  });
});
