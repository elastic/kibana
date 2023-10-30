/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TERMS_QUERY_SIZE } from '../elasticsearch_store';
import { getMsearchQueryBody } from './get_msearch_query_body';
import { mockTermsSearchQuery } from '../../../../__mocks__/terms_search_query';
import { mockVectorSearchQuery } from '../../../../__mocks__/vector_search_query';

describe('getMsearchQueryBody', () => {
  it('returns the expected multi-search request body', () => {
    const index = '.kibana-elastic-ai-assistant-kb';

    const vectorSearchQuery = mockVectorSearchQuery;
    const vectorSearchQuerySize = 4;

    const termsSearchQuery = mockTermsSearchQuery;
    const termsSearchQuerySize = TERMS_QUERY_SIZE;

    const result = getMsearchQueryBody({
      index,
      termsSearchQuery,
      termsSearchQuerySize,
      vectorSearchQuery,
      vectorSearchQuerySize,
    });

    expect(result).toEqual({
      body: [
        { index },
        {
          query: mockVectorSearchQuery,
          size: vectorSearchQuerySize,
        },
        { index },
        {
          query: mockTermsSearchQuery,
          size: TERMS_QUERY_SIZE,
        },
      ],
    });
  });
});
