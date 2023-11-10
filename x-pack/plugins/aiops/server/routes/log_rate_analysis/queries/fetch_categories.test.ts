/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';

import { getBaselineOrDeviationFilter, getCategoryRequest } from './fetch_categories';

describe('getBaselineOrDeviationFilter', () => {
  it('returns a filter that matches both baseline and deviation time range', () => {
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

    const baselineOrDeviationFilter = getBaselineOrDeviationFilter(params);

    expect(baselineOrDeviationFilter).toEqual({
      bool: {
        should: [
          {
            range: {
              'the-time-field-name': { gte: 10, lte: 20, format: 'epoch_millis' },
            },
          },
          {
            range: {
              'the-time-field-name': { gte: 30, lte: 40, format: 'epoch_millis' },
            },
          },
        ],
      },
    });
  });
});

describe('getCategoryRequest', () => {
  it('returns the category request', () => {
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

    const randomSamplerWrapper = createRandomSamplerWrapper({
      probability: 0.1,
      seed: 1234,
    });

    const query = getCategoryRequest(params, 'the-field-name', randomSamplerWrapper);

    expect(query).toEqual({
      index: 'the-index',
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      range: {
                        'the-time-field-name': {
                          gte: 10,
                          lte: 20,
                          format: 'epoch_millis',
                        },
                      },
                    },
                    {
                      range: {
                        'the-time-field-name': {
                          gte: 30,
                          lte: 40,
                          format: 'epoch_millis',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        aggs: {
          sample: {
            random_sampler: { probability: 0.1, seed: 1234 },
            aggs: {
              categories: {
                categorize_text: { field: 'the-field-name', size: 1000 },
                aggs: {
                  hit: {
                    top_hits: { size: 1, sort: ['the-time-field-name'], _source: 'the-field-name' },
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});
