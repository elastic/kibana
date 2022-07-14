/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@kbn/es-query';
import type { SimpleSavedObject } from '@kbn/core/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

export type SavedSearchSavedObject = SimpleSavedObject<any>;

export function isSavedSearchSavedObject(arg: unknown): arg is SavedSearchSavedObject {
  return isPopulatedObject(arg, ['id', 'type', 'attributes']);
}

export interface FieldValuePair {
  fieldName: string;
  fieldValue: string;
  isFallbackResult?: boolean;
}

export interface ChangePoint extends FieldValuePair {
  doc_count: number;
  bg_count: number;
  score: number;
  pValue: number | null;
}

export const SEARCH_QUERY_LANGUAGE = {
  KUERY: 'kuery',
  LUCENE: 'lucene',
} as const;

export type SearchQueryLanguage = typeof SEARCH_QUERY_LANGUAGE[keyof typeof SEARCH_QUERY_LANGUAGE];

export interface CombinedQuery {
  searchString: Query['query'];
  searchQueryLanguage: string;
}

export interface ErrorMessage {
  query: string;
  message: string;
}
