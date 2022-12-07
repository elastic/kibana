/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicatorData, SLO, SLOId } from '../../domain/models';
import { toDateRange } from '../../domain/services';
import { FindSLO } from './find_slo';
import { createSLO, createPaginatedSLO } from './fixtures/slo';
import { createSLIClientMock, createSLORepositoryMock } from './mocks';
import { SLIClient } from './sli_client';
import { SLORepository } from './slo_repository';

describe('FindSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockSLIClient: jest.Mocked<SLIClient>;
  let findSLO: FindSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockSLIClient = createSLIClientMock();
    findSLO = new FindSLO(mockRepository, mockSLIClient);
  });

  describe('happy path', () => {
    it('returns the results with pagination', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSLIClient.fetchCurrentSLIData.mockResolvedValueOnce(someIndicatorData(slo));

      const result = await findSLO.execute({});

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: undefined },
        { page: 1, perPage: 25 }
      );

      expect(result).toEqual({
        page: 1,
        per_page: 25,
        total: 1,
        results: [
          {
            id: slo.id,
            name: 'irrelevant',
            description: 'irrelevant',
            budgeting_method: 'occurrences',
            indicator: {
              params: {
                environment: 'irrelevant',
                service: 'irrelevant',
                transaction_name: 'irrelevant',
                transaction_type: 'irrelevant',
                'threshold.us': 500000,
              },
              type: 'sli.apm.transaction_duration',
            },
            objective: {
              target: 0.999,
            },
            time_window: {
              duration: '7d',
              is_rolling: true,
            },
            settings: {
              timestamp_field: '@timestamp',
              sync_delay: '1m',
              frequency: '1m',
            },
            summary: {
              sli_value: 0.9999,
              error_budget: {
                initial: 0.001,
                consumed: 0.1,
                remaining: 0.9,
                is_estimated: false,
              },
            },
            created_at: slo.created_at.toISOString(),
            updated_at: slo.updated_at.toISOString(),
            revision: slo.revision,
          },
        ],
      });
    });

    it('calls the repository with the default criteria and pagination', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSLIClient.fetchCurrentSLIData.mockResolvedValueOnce(someIndicatorData(slo));

      await findSLO.execute({});

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: undefined },
        { page: 1, perPage: 25 }
      );
    });

    it('calls the repository with the name filter criteria', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSLIClient.fetchCurrentSLIData.mockResolvedValueOnce(someIndicatorData(slo));

      await findSLO.execute({ name: 'Availability' });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: 'Availability' },
        { page: 1, perPage: 25 }
      );
    });

    it('calls the repository with the pagination', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSLIClient.fetchCurrentSLIData.mockResolvedValueOnce(someIndicatorData(slo));

      await findSLO.execute({ name: 'My SLO*', page: '2', per_page: '100' });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: 'My SLO*' },
        { page: 2, perPage: 100 }
      );
    });

    it('uses default pagination values when invalid', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSLIClient.fetchCurrentSLIData.mockResolvedValueOnce(someIndicatorData(slo));

      await findSLO.execute({ page: '-1', per_page: '0' });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: undefined },
        { page: 1, perPage: 25 }
      );
    });
  });
});

function someIndicatorData(slo: SLO): Record<SLOId, IndicatorData> {
  return {
    [slo.id]: {
      good: 9999,
      total: 10000,
      date_range: toDateRange(slo.time_window),
    },
  };
}
