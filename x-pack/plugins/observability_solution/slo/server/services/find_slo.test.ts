/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, Paginated } from '@kbn/slo-schema';
import { SLO_MODEL_VERSION } from '../../common/constants';
import { SLODefinition } from '../domain/models';
import { FindSLO } from './find_slo';
import { createSLO } from './fixtures/slo';
import { createSLORepositoryMock, createSummarySearchClientMock } from './mocks';
import { SLORepository } from './slo_repository';
import { SummaryResult, SummarySearchClient } from './summary_search_client';

describe('FindSLO', () => {
  let mockRepository: jest.Mocked<SLORepository>;
  let mockSummarySearchClient: jest.Mocked<SummarySearchClient>;
  let findSLO: FindSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockSummarySearchClient = createSummarySearchClientMock();
    findSLO = new FindSLO(mockRepository, mockSummarySearchClient);
  });

  describe('happy path', () => {
    it('returns the results with pagination', async () => {
      const slo = createSLO();
      mockSummarySearchClient.search.mockResolvedValueOnce(summarySearchResult(slo));
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);

      const result = await findSLO.execute({});

      expect(mockSummarySearchClient.search.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "",
          "",
          Object {
            "direction": "asc",
            "field": "status",
          },
          Object {
            "page": 1,
            "perPage": 25,
          },
          undefined,
        ]
      `);

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
                threshold: 500,
                index: 'metrics-apm*',
              },
              type: 'sli.apm.transactionDuration',
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
            version: SLO_MODEL_VERSION,
          },
        ],
      });
    });

    it('calls the repository with all the summary slo ids', async () => {
      const slo = createSLO();
      mockSummarySearchClient.search.mockResolvedValueOnce(summarySearchResult(slo));
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);

      await findSLO.execute({});

      expect(mockRepository.findAllByIds).toHaveBeenCalledWith([slo.id]);
    });

    it('searches with the provided criteria', async () => {
      const slo = createSLO();
      mockSummarySearchClient.search.mockResolvedValueOnce(summarySearchResult(slo));
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);

      await findSLO.execute({
        kqlQuery: "slo.name:'Service*' and slo.indicator.type:'sli.kql.custom'",
        page: '2',
        perPage: '10',
        sortBy: 'error_budget_consumed',
        sortDirection: 'asc',
      });

      expect(mockSummarySearchClient.search.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "slo.name:'Service*' and slo.indicator.type:'sli.kql.custom'",
          "",
          Object {
            "direction": "asc",
            "field": "error_budget_consumed",
          },
          Object {
            "page": 2,
            "perPage": 10,
          },
          undefined,
        ]
      `);
    });
  });

  describe('validation', () => {
    it("throws an error when 'perPage > 5000'", async () => {
      const slo = createSLO();
      mockSummarySearchClient.search.mockResolvedValueOnce(summarySearchResult(slo));
      mockRepository.findAllByIds.mockResolvedValueOnce([slo]);

      await expect(findSLO.execute({ perPage: '5000' })).resolves.not.toThrow();
      await expect(findSLO.execute({ perPage: '5001' })).rejects.toThrowError(
        'perPage limit set to 5000'
      );
    });
  });
});

function summarySearchResult(slo: SLODefinition): Paginated<SummaryResult> {
  return {
    total: 1,
    perPage: 25,
    page: 1,
    results: [
      {
        sloId: slo.id,
        instanceId: slo.groupBy === ALL_VALUE ? ALL_VALUE : 'host-abcde',
        groupings: {},
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
      },
    ],
  };
}
