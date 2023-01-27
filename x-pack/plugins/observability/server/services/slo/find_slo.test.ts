/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO, SLOId, Summary } from '../../domain/models';
import { FindSLO } from './find_slo';
import { createSLO, createPaginatedSLO } from './fixtures/slo';
import { createSummaryClientMock, createSLORepositoryMock } from './mocks';
import { SLORepository, SortField, SortDirection } from './slo_repository';
import { SummaryClient } from './summary_client';

describe('FindSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockSummaryClient: jest.Mocked<SummaryClient>;
  let findSLO: FindSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockSummaryClient = createSummaryClientMock();
    findSLO = new FindSLO(mockRepository, mockSummaryClient);
  });

  describe('happy path', () => {
    it('returns the results with pagination', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSummaryClient.fetchSummary.mockResolvedValueOnce(someSummary(slo));

      const result = await findSLO.execute({});

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: undefined },
        { field: SortField.Name, direction: SortDirection.Asc },
        { page: 1, perPage: 25 }
      );

      expect(result).toEqual({
        page: 1,
        perPage: 25,
        total: 1,
        results: [
          {
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
                'threshold.us': 500000,
              },
              type: 'sli.apm.transactionDuration',
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
          },
        ],
      });
    });

    it('calls the repository with the default criteria and pagination', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSummaryClient.fetchSummary.mockResolvedValueOnce(someSummary(slo));

      await findSLO.execute({});

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: undefined },
        { field: SortField.Name, direction: SortDirection.Asc },
        { page: 1, perPage: 25 }
      );
    });

    it('calls the repository with the name filter criteria', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSummaryClient.fetchSummary.mockResolvedValueOnce(someSummary(slo));

      await findSLO.execute({ name: 'Availability' });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: 'Availability' },
        { field: SortField.Name, direction: SortDirection.Asc },
        { page: 1, perPage: 25 }
      );
    });

    it('calls the repository with the indicatorType filter criteria', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSummaryClient.fetchSummary.mockResolvedValueOnce(someSummary(slo));

      await findSLO.execute({ indicatorTypes: ['sli.kql.custom'] });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { indicatorTypes: ['sli.kql.custom'] },
        { field: SortField.Name, direction: SortDirection.Asc },
        { page: 1, perPage: 25 }
      );
    });

    it('calls the repository with the pagination', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSummaryClient.fetchSummary.mockResolvedValueOnce(someSummary(slo));

      await findSLO.execute({ name: 'My SLO*', page: '2', perPage: '100' });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: 'My SLO*' },
        { field: SortField.Name, direction: SortDirection.Asc },
        { page: 2, perPage: 100 }
      );
    });

    it('uses default pagination values when invalid', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSummaryClient.fetchSummary.mockResolvedValueOnce(someSummary(slo));

      await findSLO.execute({ page: '-1', perPage: '0' });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: undefined },
        { field: SortField.Name, direction: SortDirection.Asc },
        { page: 1, perPage: 25 }
      );
    });

    it('sorts by name by default when not specified', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSummaryClient.fetchSummary.mockResolvedValueOnce(someSummary(slo));

      await findSLO.execute({ sortBy: undefined });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: undefined },
        { field: SortField.Name, direction: SortDirection.Asc },
        { page: 1, perPage: 25 }
      );
    });

    it('sorts by indicator type', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSummaryClient.fetchSummary.mockResolvedValueOnce(someSummary(slo));

      await findSLO.execute({ sortBy: 'indicatorType' });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: undefined },
        { field: SortField.IndicatorType, direction: SortDirection.Asc },
        { page: 1, perPage: 25 }
      );
    });

    it('sorts by indicator type in descending order', async () => {
      const slo = createSLO();
      mockRepository.find.mockResolvedValueOnce(createPaginatedSLO(slo));
      mockSummaryClient.fetchSummary.mockResolvedValueOnce(someSummary(slo));

      await findSLO.execute({ sortBy: 'indicatorType', sortDirection: 'desc' });

      expect(mockRepository.find).toHaveBeenCalledWith(
        { name: undefined },
        { field: SortField.IndicatorType, direction: SortDirection.Desc },
        { page: 1, perPage: 25 }
      );
    });
  });
});

function someSummary(slo: SLO): Record<SLOId, Summary> {
  return {
    [slo.id]: {
      status: 'HEALTHY',
      sliValue: 0.9999,
      errorBudget: {
        initial: 0.001,
        consumed: 0.1,
        remaining: 0.9,
        isEstimated: false,
      },
    },
  };
}
