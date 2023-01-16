/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toDateRange } from '../../domain/services';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';
import { GetSLO } from './get_slo';
import { createSLIClientMock, createSLORepositoryMock } from './mocks';
import { SLIClient } from './sli_client';
import { SLORepository } from './slo_repository';

describe('GetSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockSLIClient: jest.Mocked<SLIClient>;
  let getSLO: GetSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockSLIClient = createSLIClientMock();
    getSLO = new GetSLO(mockRepository, mockSLIClient);
  });

  describe('happy path', () => {
    it('retrieves the SLO from the repository', async () => {
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });
      mockRepository.findById.mockResolvedValueOnce(slo);
      mockSLIClient.fetchCurrentSLIData.mockResolvedValueOnce({
        [slo.id]: {
          good: 9999,
          total: 10000,
          dateRange: toDateRange(slo.timeWindow),
        },
      });

      const result = await getSLO.execute(slo.id);

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
            goodStatusCodes: ['2xx', '3xx', '4xx'],
          },
          type: 'sli.apm.transactionErrorRate',
        },
        objective: {
          target: 0.999,
        },
        timeWindow: {
          duration: '7d',
          isRolling: true,
        },
        settings: {
          timestampField: '@timestamp',
          syncDelay: '1m',
          frequency: '1m',
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
        createdAt: slo.createdAt.toISOString(),
        updatedAt: slo.updatedAt.toISOString(),
        revision: slo.revision,
      });
    });
  });
});
