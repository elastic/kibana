/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * This Elasticsearch query DSL is a terms search for required `esql` KB docs
 */
export const mockTermsSearchQuery: QueryDslQueryContainer = {
  bool: {
    must: [
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
};
