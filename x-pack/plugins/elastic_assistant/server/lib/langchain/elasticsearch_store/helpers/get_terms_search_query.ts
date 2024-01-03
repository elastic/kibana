/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Field,
  FieldValue,
  QueryDslTermQuery,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';

/**
 * Returns an Elasticsearch DSL query that performs a terms search,
 * such that all of the specified terms must be present in the search results.
 *
 * @param mustTerms All of the specified terms must be present in the search results
 *
 * @returns An Elasticsearch DSL query that performs a terms search, such that all of the specified terms must be present in the search results
 */
export const getTermsSearchQuery = (
  mustTerms: Array<Partial<Record<Field, QueryDslTermQuery | FieldValue>>>
): QueryDslQueryContainer => ({
  bool: {
    must: [...mustTerms], // all of the specified terms must be present in the search results
  },
});
