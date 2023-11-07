/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

export const getParsedFilterQuery: (filter: string | undefined) => Array<Record<string, any>> = (
  filter
) => {
  if (!filter) return [];

  try {
    const parsedQuery = toElasticsearchQuery(fromKueryExpression(filter));
    return [parsedQuery];
  } catch (error) {
    return [];
  }
};
