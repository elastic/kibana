/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAnomalies, AnomaliesSearchParams } from '.';

const getFiltersFromMock = (mock: jest.Mock) => {
  const [[searchParams]] = mock.mock.calls;
  return searchParams.body.query.bool.filter;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getBoolCriteriaFromFilters = (filters: any[]) => filters[1].bool.must;

describe('getAnomalies', () => {
  let searchParams: AnomaliesSearchParams;

  beforeEach(() => {
    searchParams = {
      jobIds: ['jobId1'],
      threshold: 5,
      earliestMs: 1588517231429,
      latestMs: 1588617231429,
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
});
