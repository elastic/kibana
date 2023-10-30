/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Field, FieldValue, QueryDslTermQuery } from '@elastic/elasticsearch/lib/api/types';

/**
 * These (mock) terms may be used in multiple queries.
 *
 * For example, it may be be used in a vector search to exclude the required `esql` KB docs.
 *
 * It may also be used in a terms search to find all of the required `esql` KB docs.
 */
export const mockTerms: Array<Partial<Record<Field, QueryDslTermQuery | FieldValue>>> = [
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
];
