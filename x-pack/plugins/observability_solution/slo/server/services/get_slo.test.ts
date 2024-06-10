/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { SLO_MODEL_VERSION } from '../../common/constants';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';
import { GetSLO } from './get_slo';
import { createSummaryClientMock, createSLORepositoryMock } from './mocks';
import { SLORepository } from './slo_repository';
import { SummaryClient } from './summary_client';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { SloDefinitionClient } from './slo_definition_client';

describe('GetSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockSummaryClient: jest.Mocked<SummaryClient>;
  let getSLO: GetSLO;
  let defintionClient: SloDefinitionClient;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockSummaryClient = createSummaryClientMock();
    defintionClient = new SloDefinitionClient(
      mockRepository,
      elasticsearchServiceMock.createElasticsearchClient(),
      loggerMock.create()
    );
    getSLO = new GetSLO(defintionClient, mockSummaryClient);
  });

  describe('happy path', () => {
    it('retrieves the SLO from the repository', async () => {
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });
      mockRepository.findById.mockResolvedValueOnce(slo);
      mockSummaryClient.computeSummary.mockResolvedValueOnce({
        groupings: {},
        meta: {},
        summary: {
          status: 'HEALTHY',
          sliValue: 0.9999,
          errorBudget: {
            initial: 0.001,
            consumed: 0.1,
            remaining: 0.9,
            isEstimated: false,
          },
        },
      });

      const result = await getSLO.execute(slo.id, 'default');

      expect(mockRepository.findById).toHaveBeenCalledWith(slo.id);
      expect(result).toEqual({
        id: slo.id,
        name: 'irrelevant',
        description: 'irrelevant',
        budgetingMethod: 'occurrences',
        indicator: {
          params: {
            environment: 'irrelevant',
            service: 'irrelevant',
            transactionName: 'irrelevant',
            transactionType: 'irrelevant',
            index: 'metrics-apm*',
          },
          type: 'sli.apm.transactionErrorRate',
        },
        objective: {
          target: 0.999,
        },
        timeWindow: {
          duration: '7d',
          type: 'rolling',
        },
        settings: {
          syncDelay: '1m',
          frequency: '1m',
          preventInitialBackfill: false,
        },
        summary: {
          status: 'HEALTHY',
          sliValue: 0.9999,
          errorBudget: {
            initial: 0.001,
            consumed: 0.1,
            remaining: 0.9,
            isEstimated: false,
          },
        },
        tags: ['critical', 'k8s'],
        createdAt: slo.createdAt.toISOString(),
        updatedAt: slo.updatedAt.toISOString(),
        enabled: slo.enabled,
        revision: slo.revision,
        groupBy: slo.groupBy,
        groupings: {},
        instanceId: ALL_VALUE,
        meta: {},
        version: SLO_MODEL_VERSION,
      });
    });
  });
});
