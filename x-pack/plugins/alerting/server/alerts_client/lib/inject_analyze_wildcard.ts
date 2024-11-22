/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export const injectAnalyzeWildcard = (query: QueryDslQueryContainer): void => {
  if (!query) {
    return;
  }

  if (Array.isArray(query)) {
    return query.forEach((child) => injectAnalyzeWildcard(child));
  }

  if (typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (key !== 'query_string') {
        return injectAnalyzeWildcard(value);
      }

      if (typeof value.query === 'string' && value.query.includes('*')) {
        value.analyze_wildcard = true;
      }
    });
  }
};
