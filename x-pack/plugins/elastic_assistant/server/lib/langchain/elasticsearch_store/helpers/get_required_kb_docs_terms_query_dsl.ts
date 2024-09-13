/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Field, FieldValue, QueryDslTermQuery } from '@elastic/elasticsearch/lib/api/types';

/**
 * For the specified topic, returns an array of filters that can be used in a
 * `bool` Elasticsearch DSL query to filter in/out required KB documents.
 *
 * The returned filters can be used in different types of queries to, for example:
 * - To filter out required KB documents from a vector search
 * - To filter in required KB documents in a terms query
 *
 * @param kbResource Search for required KB documents for this topic
 *
 * @returns An array of `term`s that may be used in a `bool` Elasticsearch DSL query to filter in/out required KB documents
 */
export const getRequiredKbDocsTermsQueryDsl = (
  kbResource: string
): Array<Partial<Record<Field, QueryDslTermQuery | FieldValue>>> => [
  {
    term: {
      'metadata.kbResource': kbResource,
    },
  },
  {
    term: {
      'metadata.required': true,
    },
  },
];
