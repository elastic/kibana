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
        good: 9999,
        total: 10000,
        date_range: toDateRange(slo.time_window),
      });

      const result = await getSLO.execute(slo.id);

      expect(mockRepository.findById).toHaveBeenCalledWith(slo.id);
      expect(result).toEqual({
        id: slo.id,
        name: 'irrelevant',
        description: 'irrelevant',
        budgeting_method: 'occurrences',
        indicator: {
          params: {
            environment: 'irrelevant',
            good_status_codes: ['2xx', '3xx', '4xx'],
            service: 'irrelevant',
            transaction_name: 'irrelevant',
            transaction_type: 'irrelevant',
          },
          type: 'sli.apm.transaction_error_rate',
        },
        objective: {
          target: 0.999,
        },
        time_window: {
          duration: '7d',
          is_rolling: true,
        },

        summary: {
          sli_value: 0.9999,
          error_budget: {
            initial: 0.001,
            consumed: 0.1,
            remaining: 0.9,
          },
        },
        created_at: slo.created_at.toISOString(),
        updated_at: slo.updated_at.toISOString(),
        revision: slo.revision,
      });
    });
  });
});
