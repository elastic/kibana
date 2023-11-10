/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCategoryCountRequest } from './fetch_category_counts';

describe('getCategoryCountRequest', () => {
  it('returns the category count request', () => {
    const params = {
      index: 'the-index',
      timeFieldName: 'the-time-field-name',
      start: 0,
      end: 50,
      baselineMin: 10,
      baselineMax: 20,
      deviationMin: 30,
      deviationMax: 40,
      includeFrozen: false,
      searchQuery: '{ "match_all": {} }',
    };

    const category = {
      key: 'runTask ended no files to process',
      count: 667,
      examples: ['[runTask()] ended: no files to process'],
    };

    const query = getCategoryCountRequest(
      params,
      'the-field-name',
      category,
      params.baselineMin,
      params.baselineMax
    );

    expect(query).toEqual({
      index: 'the-index',
      body: {
        query: {
          bool: {
            filter: [
              { range: { 'the-time-field-name': { gte: 10, lte: 20, format: 'epoch_millis' } } },
              {
                bool: {
                  should: [
                    {
                      match: {
                        'the-field-name': {
                          auto_generate_synonyms_phrase_query: false,
                          fuzziness: 0,
                          operator: 'and',
                          query: 'runTask ended no files to process',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        size: 0,
        track_total_hits: true,
      },
    });
  });
});
