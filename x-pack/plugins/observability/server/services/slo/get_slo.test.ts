/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';
import { GetSLO } from './get_slo';
import { createSLORepositoryMock } from './mocks';
import { SLORepository } from './slo_repository';

describe('GetSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let getSLO: GetSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    getSLO = new GetSLO(mockRepository);
  });

  describe('happy path', () => {
    it('retrieves the SLO from the repository', async () => {
      const slo = createSLO(createAPMTransactionErrorRateIndicator());
      mockRepository.findById.mockResolvedValueOnce(slo);

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
          type: 'slo.apm.transaction_error_rate',
        },
        objective: {
          target: 0.999,
        },
        time_window: {
          duration: '7d',
          is_rolling: true,
        },
        created_at: slo.created_at,
        updated_at: slo.updated_at,
        revision: slo.revision,
      });
    });
  });
});
