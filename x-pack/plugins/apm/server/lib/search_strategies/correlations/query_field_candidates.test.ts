/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRandomDocsRequest,
  hasPrefixToInclude,
  shouldBeExcluded,
} from './query_field_candidates';

describe('query_field_candidates', () => {
  describe('shouldBeExcluded()', () => {
    it('does not exclude a completely custom field name', () => {
      expect(shouldBeExcluded('myFieldName')).toBe(false);
    });

    it(`excludes a field if it's one of FIELDS_TO_EXCLUDE_AS_CANDIDATE`, () => {
      expect(shouldBeExcluded('transaction.type')).toBe(true);
    });

    it(`excludes a field if it's prefixed with one of FIELD_PREFIX_TO_EXCLUDE_AS_CANDIDATE`, () => {
      expect(shouldBeExcluded('observer.myFieldName')).toBe(true);
    });
  });

  describe('hasPrefixToInclude()', () => {
    it('identifies if a field name is prefixed to be included', () => {
      expect(hasPrefixToInclude('myFieldName')).toBe(false);
      expect(hasPrefixToInclude('somePrefix.myFieldName')).toBe(false);
      expect(hasPrefixToInclude('cloud.myFieldName')).toBe(true);
      expect(hasPrefixToInclude('labels.myFieldName')).toBe(true);
      expect(hasPrefixToInclude('user_agent.myFieldName')).toBe(true);
    });
  });

  describe('getRandomDocsRequest()', () => {
    it('returns the most basic request body for a sample of random documents', () => {
      const req = getRandomDocsRequest({ index: 'apm-*' });

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
                      term: {
                        'processor.event': 'transaction',
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
        index: 'apm-*',
      });
    });
  });
});
