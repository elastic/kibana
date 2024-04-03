/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MsearchKbHit, MsearchResponse } from './types';

/**
 * Represents a flattened hit from an Elasticsearch Msearch response
 *
 * It contains the page content and metadata source of a KB document
 */
export interface FlattenedHit {
  pageContent: string;
  metadata: {
    source: string;
  };
}

/**
 * Returns an array of flattened hits from the specified Msearch response
 * that contain the page content and metadata source of KB documents
 *
 * @param maybeMsearchResponse An Elasticsearch Msearch response, which returns the results of multiple searches in a single request
 * @returns Returns an array of flattened hits from the specified Msearch response that contain the page content and metadata source of KB documents
 */
export const getFlattenedHits = (
  maybeMsearchResponse: MsearchResponse | undefined
): FlattenedHit[] =>
  maybeMsearchResponse?.hits?.hits?.flatMap((hit: MsearchKbHit) => ({
    pageContent: hit?._source?.text ?? '',
    metadata: {
      source: hit?._source?.metadata?.source ?? '',
    },
  })) ?? [];
