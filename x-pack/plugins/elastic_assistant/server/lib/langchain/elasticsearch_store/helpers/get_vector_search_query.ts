/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Field,
  FieldValue,
  QueryDslQueryContainer,
  QueryDslTermQuery,
} from '@elastic/elasticsearch/lib/api/types';

/**
 * Returns an Elasticsearch query DSL that performs a vector search
 * that excludes a set of documents from the search results.
 *
 * @param filter Optional filter to apply to the search
 * @param modelId ID of the model to search with, e.g. `.elser_model_2`
 * @param mustNotTerms Array of objects that may be used in a `bool` Elasticsearch DSL query to, for example, exclude the required KB docs from the vector search, so there's no overlap
 * @param query The search query provided by the user
 * @returns
 */
export const getVectorSearchQuery = ({
  filter,
  modelId,
  mustNotTerms,
  query,
}: {
  filter: QueryDslQueryContainer | undefined;
  modelId: string;
  mustNotTerms: Array<Partial<Record<Field, QueryDslTermQuery | FieldValue>>>;
  query: string;
}): QueryDslQueryContainer => ({
  bool: {
    must_not: [...mustNotTerms],
    must: [
      {
        text_expansion: {
          'vector.tokens': {
            model_id: modelId,
            model_text: query,
          },
        },
      },
    ],
    filter,
  },
});
