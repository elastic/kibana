/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '@kbn/core/types/elasticsearch';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getAnomalies, AnomaliesSearchParams } from '.';

const getFiltersFromMock = (mock: jest.Mock) => {
  const [[searchParams]] = mock.mock.calls;
  return searchParams.body.query.bool.filter;
};

const getBoolCriteriaFromFilters = (filters: ESFilter[]) =>
  filters.find((filter) => filter?.bool?.must)?.bool?.must;

describe('getAnomalies', () => {
  let searchParams: AnomaliesSearchParams;

  beforeEach(() => {
    searchParams = {
      jobIds: ['jobId1'],
      threshold: 5,
      earliestMs: 1588517231429,
      latestMs: 1588617231429,
      exceptionItems: [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()],
    };
  });

  it('calls the provided mlAnomalySearch function', () => {
    const mockMlAnomalySearch = jest.fn();
    getAnomalies(searchParams, mockMlAnomalySearch);

    expect(mockMlAnomalySearch).toHaveBeenCalled();
  });

  it('passes anomalyThreshold as part of the query', () => {
    const mockMlAnomalySearch = jest.fn();
    getAnomalies(searchParams, mockMlAnomalySearch);
    const filters = getFiltersFromMock(mockMlAnomalySearch);
    const criteria = getBoolCriteriaFromFilters(filters);

    expect(criteria).toEqual(
      expect.arrayContaining([{ range: { record_score: { gte: searchParams.threshold } } }])
    );
  });

  it('passes time range as part of the query', () => {
    const mockMlAnomalySearch = jest.fn();
    getAnomalies(searchParams, mockMlAnomalySearch);
    const filters = getFiltersFromMock(mockMlAnomalySearch);
    const criteria = getBoolCriteriaFromFilters(filters);

    expect(criteria).toEqual(
      expect.arrayContaining([
        {
          range: {
            timestamp: {
              gte: searchParams.earliestMs,
              lte: searchParams.latestMs,
              format: 'epoch_millis',
            },
          },
        },
      ])
    );
  });

  it('passes a single jobId as part of the query', () => {
    const mockMlAnomalySearch = jest.fn();
    getAnomalies(searchParams, mockMlAnomalySearch);
    const filters = getFiltersFromMock(mockMlAnomalySearch);
    const criteria = getBoolCriteriaFromFilters(filters);

    expect(criteria).toEqual(
      expect.arrayContaining([
        {
          query_string: {
            analyze_wildcard: false,
            query: 'job_id:jobId1',
          },
        },
      ])
    );
  });

  it('passes multiple jobIds as part of the query', () => {
    const mockMlAnomalySearch = jest.fn();
    searchParams.jobIds = ['jobId1', 'jobId2'];
    getAnomalies(searchParams, mockMlAnomalySearch);
    const filters = getFiltersFromMock(mockMlAnomalySearch);
    const criteria = getBoolCriteriaFromFilters(filters);

    expect(criteria).toEqual(
      expect.arrayContaining([
        {
          query_string: {
            analyze_wildcard: false,
            query: 'job_id:jobId1 OR job_id:jobId2',
          },
        },
      ])
    );
  });

  it('ignores anomalies that do not have finalized scores', () => {
    const mockMlAnomalySearch = jest.fn();
    getAnomalies(searchParams, mockMlAnomalySearch);
    const filters = getFiltersFromMock(mockMlAnomalySearch);

    expect(filters).toEqual(
      expect.arrayContaining([
        {
          term: {
            is_interim: false,
          },
        },
      ])
    );
  });
});
