/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTermsSearchQuery } from './get_terms_search_query';
import { mockTerms } from '../../../../__mocks__/terms';

describe('getTermsSearchQuery', () => {
  it('returns the expected Elasticsearch query DSL', () => {
    const query = getTermsSearchQuery(mockTerms);

    expect(query).toEqual({
      bool: {
        must: mockTerms,
      },
    });
  });
});
