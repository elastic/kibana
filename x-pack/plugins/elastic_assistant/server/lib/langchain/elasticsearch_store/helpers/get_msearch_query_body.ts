/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * Represents an entry in a multi-search request body that specifies the name of an index to search
 */
export interface MsearchQueryBodyIndexEntry {
  index: string;
}

/**
 * Represents an entry in a multi-search request body that specifies a query to execute
 */
export interface MsearchQueryBodyQueryEntry {
  query: QueryDslQueryContainer;
  size: number;
}

/**
 * Represents a multi-search request body, which returns the results of multiple searches in a single request
 */
export interface MsearchQueryBody {
  body: Array<MsearchQueryBodyIndexEntry | MsearchQueryBodyQueryEntry>;
}

/**
 * Returns a multi-search request body, which returns the results of multiple searches in a single request
 *
 * @param index The KB index to search, e.g. `.kibana-elastic-ai-assistant-kb`
 * @param termsSearchQuery An Elasticsearch DSL query that performs a terms search, typically used to search for required KB documents
 * @param termsSearchQuerySize The maximum number of required KB documents to return
 * @param vectorSearchQuery An Elasticsearch DSL query that performs a vector search, typically used to search for similar KB documents
 * @param vectorSearchQuerySize The maximum number of similar KB documents to return
 * @returns A multi-search request body, which returns the results of multiple searches in a single request
 */
export const getMsearchQueryBody = ({
  index,
  termsSearchQuery,
  termsSearchQuerySize,
  vectorSearchQuery,
  vectorSearchQuerySize,
}: {
  index: string;
  termsSearchQuery: QueryDslQueryContainer;
  termsSearchQuerySize: number;
  vectorSearchQuery: QueryDslQueryContainer;
  vectorSearchQuerySize: number;
}): MsearchQueryBody => ({
  body: [
    { index },
    {
      query: vectorSearchQuery,
      size: vectorSearchQuerySize,
    },
    { index },
    {
      query: termsSearchQuery,
      size: termsSearchQuerySize,
    },
  ],
});
