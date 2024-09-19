/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INLINE_ESQL_QUERY_REGEX } from '../../../../common/tasks/nl_to_esql/constants';

export interface QueryWithPosition {
  /** the query text, without the ```esql``` */
  query: string;
  /** the query start position in the text - INCLUDING the ```esql``` */
  startPos: number;
  /** the query end position in the text - INCLUDING the ```esql``` */
  endPos: number;
}

/**
 * Extract the esql queries from a given string content.
 *
 * Note: it will only find queries wrapped with ```esql [query] ```
 */
export const extractQueries = (text: string): QueryWithPosition[] => {
  return Array.from(text.matchAll(INLINE_ESQL_QUERY_REGEX))
    .filter((match) => {
      return match[1] !== undefined && match.index !== undefined;
    })
    .map((match) => {
      return {
        query: match[1],
        startPos: match.index!,
        endPos: match.index! + match[0].length,
      };
    });
};
