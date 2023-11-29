/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramsSearchQueryMock } from './__mocks__/params_search_query';

import { getRandomDocsRequest } from './get_random_docs_request';

describe('getRandomDocsRequest', () => {
  it('returns the most basic request body for a sample of random documents', () => {
    const req = getRandomDocsRequest(paramsSearchQueryMock);

    expect(req).toEqual({
      body: {
        _source: false,
        fields: ['*'],
        query: {
          function_score: {
            query: {
              bool: {
                filter: [
                  {
                    bool: {
                      filter: [],
                      minimum_should_match: 1,
                      must_not: [],
                      should: [{ term: { 'the-term': { value: 'the-value' } } }],
                    },
                  },
                  {
                    range: {
                      'the-time-field-name': {
                        format: 'epoch_millis',
                        gte: 0,
                        lte: 50,
                      },
                    },
                  },
                ],
              },
            },
            random_score: {},
          },
        },
        size: 1000,
        track_total_hits: true,
      },
      index: paramsSearchQueryMock.index,
      ignore_throttled: undefined,
      ignore_unavailable: true,
    });
  });
});
