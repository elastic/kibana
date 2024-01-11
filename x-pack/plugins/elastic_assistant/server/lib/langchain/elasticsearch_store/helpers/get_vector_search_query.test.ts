/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { getVectorSearchQuery } from './get_vector_search_query';
import { mockTerms } from '../../../../__mocks__/terms';
import { mockQueryText } from '../../../../__mocks__/query_text';

describe('getVectorSearchQuery', () => {
  it('returns the expected query when mustNotTerms is empty', () => {
    const result = getVectorSearchQuery({
      filter: undefined,
      modelId: '.elser_model_2',
      mustNotTerms: [], // <--- empty
      query: mockQueryText,
    });

    expect(result).toEqual({
      bool: {
        filter: undefined,
        must: [
          {
            text_expansion: {
              'vector.tokens': {
                model_id: '.elser_model_2',
                model_text:
                  'Generate an ES|QL query that will count the number of connections made to external IP addresses, broken down by user. If the count is greater than 100 for a specific user, add a new field called follow_up that contains a value of true, otherwise, it should contain false. The user names should also be enriched with their respective group names.',
              },
            },
          },
        ],
        must_not: [],
      },
    });
  });

  it('returns the expected query when mustNotTerms are provided', () => {
    const result = getVectorSearchQuery({
      filter: undefined,
      modelId: '.elser_model_2',
      mustNotTerms: mockTerms, // <--- mock terms
      query: mockQueryText,
    });

    expect(result).toEqual({
      bool: {
        filter: undefined,
        must: [
          {
            text_expansion: {
              'vector.tokens': {
                model_id: '.elser_model_2',
                model_text:
                  'Generate an ES|QL query that will count the number of connections made to external IP addresses, broken down by user. If the count is greater than 100 for a specific user, add a new field called follow_up that contains a value of true, otherwise, it should contain false. The user names should also be enriched with their respective group names.',
              },
            },
          },
        ],
        must_not: [
          {
            term: {
              'metadata.kbResource': 'esql',
            },
          },
          {
            term: {
              'metadata.required': true,
            },
          },
        ],
      },
    });
  });

  it('returns the expected results when a filter is provided', () => {
    const filter: QueryDslQueryContainer = {
      bool: {
        must: [
          {
            term: {
              'some.field': 'value',
            },
          },
        ],
      },
    };

    const result = getVectorSearchQuery({
      filter,
      modelId: '.elser_model_2',
      mustNotTerms: mockTerms, // <--- mock terms
      query: mockQueryText,
    });

    expect(result).toEqual({
      bool: {
        filter,
        must: [
          {
            text_expansion: {
              'vector.tokens': {
                model_id: '.elser_model_2',
                model_text:
                  'Generate an ES|QL query that will count the number of connections made to external IP addresses, broken down by user. If the count is greater than 100 for a specific user, add a new field called follow_up that contains a value of true, otherwise, it should contain false. The user names should also be enriched with their respective group names.',
              },
            },
          },
        ],
        must_not: [
          {
            term: {
              'metadata.kbResource': 'esql',
            },
          },
          {
            term: {
              'metadata.required': true,
            },
          },
        ],
      },
    });
  });
});
