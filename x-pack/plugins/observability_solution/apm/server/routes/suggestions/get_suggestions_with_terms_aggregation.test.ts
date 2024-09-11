/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getSuggestionsWithTermsAggregation } from './get_suggestions_with_terms_aggregation';

const mockSearch = jest.fn();

const apmEventClient: jest.Mocked<APMEventClient> = {
  search: mockSearch,
} as any;

describe('getSuggestionsWithTermsAggregation', () => {
  const fieldValue = 'testFieldValue';
  const searchAggregatedTransactions = true;
  const serviceName = 'testServiceName';
  const size = 10;
  const start = 0;
  const end = 1000;

  const defaultParams = {
    fieldValue,
    searchAggregatedTransactions,
    serviceName,
    apmEventClient,
    size,
    start,
    end,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockResolvedValue({});
  });

  it('should include wildcard query if testFieldName is provided', async () => {
    const fieldName = 'testFieldName';

    await getSuggestionsWithTermsAggregation({
      fieldName,
      ...defaultParams,
    });

    expect(mockSearch).toHaveBeenCalledWith(
      'get_suggestions_with_terms_aggregation',
      expectWildcardQueryPresenceInFilters({ fieldName, fieldValue, present: true })
    );
  });

  it('should not include wildcard query if testFieldName is not provided', async () => {
    const fieldName = '';

    await getSuggestionsWithTermsAggregation({
      fieldName,
      ...defaultParams,
    });

    expect(mockSearch).toHaveBeenCalledWith(
      'get_suggestions_with_terms_aggregation',
      expectWildcardQueryPresenceInFilters({ fieldName, fieldValue, present: false })
    );
  });
});

const expectWildcardQueryPresenceInFilters = (params: {
  fieldName: string;
  fieldValue: string;
  present: boolean;
}) => {
  const { fieldName, fieldValue, present } = params;
  const wildcardQuery = createWildcardQueryMatcher(fieldName, fieldValue);
  const expectation = present ? expect.arrayContaining : expect.not.arrayContaining;

  return expect.objectContaining({
    body: expect.objectContaining({
      query: expect.objectContaining({
        bool: expect.objectContaining({
          filter: expectation([expect.objectContaining(wildcardQuery)]),
        }),
      }),
    }),
  });
};

const createWildcardQueryMatcher = (fieldName: string, fieldValue: string) => {
  return {
    wildcard: expect.objectContaining({
      [fieldName]: expect.objectContaining({
        value: `*${fieldValue}*`,
      }),
    }),
  };
};
