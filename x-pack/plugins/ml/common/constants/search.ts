/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE = 500;
export const ANOMALIES_TABLE_DEFAULT_QUERY_SIZE = 500;

export const SEARCH_QUERY_LANGUAGE = {
  KUERY: 'kuery',
  LUCENE: 'lucene',
} as const;

export type SearchQueryLanguage = typeof SEARCH_QUERY_LANGUAGE[keyof typeof SEARCH_QUERY_LANGUAGE];

export interface ErrorMessage {
  query: string;
  message: string;
}
