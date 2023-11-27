/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * A mock vector search query DSL
 */
export const mockVectorSearchQuery: QueryDslQueryContainer = {
  bool: {
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
    must: [
      {
        text_expansion: {
          'vector.tokens': {
            model_id: '.elser_model_2',
            model_text:
              'Generate an ES|QL query that will count the number of connections made to external IP addresses, broken down by user. If the count is greater than 100 for a specific user, add a new field called "follow_up" that contains a value of "true", otherwise, it should contain "false". The user names should also be enriched with their respective group names.',
          },
        },
      },
    ],
  },
} as QueryDslQueryContainer;
