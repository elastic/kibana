/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindSLO } from './find_slo';
import { createSLO, createPaginatedSLO } from './fixtures/slo';
import { createSLORepositoryMock } from './mocks';
import { SLORepository } from './slo_repository';

describe('FindSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let findSLO: FindSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    findSLO = new FindSLO(mockRepository);
  });

  describe('happy path', () => {
    it('returns the results with pagination', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));

      const result = await findSLO.execute({});

      expect(mockRepository.find).toHaveBeenCalledWith(
        { nameFilter: undefined },
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
              type: 'slo.apm.transaction_duration',
            },
            objective: {
              target: 0.999,
            },
            time_window: {
              duration: '7d',
              is_rolling: true,
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

      await findSLO.execute({});

      expect(mockRepository.find).toHaveBeenCalledWith(
        { nameFilter: undefined },
        { page: 1, perPage: 25 }
      );
    });

    it('calls the repository with the name filter criteria', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));

      await findSLO.execute({ name_filter: 'Availability' });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { nameFilter: 'Availability' },
        { page: 1, perPage: 25 }
      );
    });

    it('calls the repository with the pagination', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));

      await findSLO.execute({ name_filter: 'My SLO*', page: '2', per_page: '100' });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { nameFilter: 'My SLO*' },
        { page: 2, perPage: 100 }
      );
    });

    it('uses default pagination values when invalid', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));

      await findSLO.execute({ page: '-1', per_page: '0' });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { nameFilter: undefined },
        { page: 1, perPage: 25 }
      );
    });
  });
});
