/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { SearchConfigurationType } from '../../../../../common/rules/schema';

export const getParsedFilterQuery: (
  searchConfiguration: SearchConfigurationType | undefined
) => Array<Record<string, any>> = (searchConfiguration) => {
  const filter = searchConfiguration?.query?.query;
  if (!filter) return [];

  try {
    const parsedQuery = toElasticsearchQuery(fromKueryExpression(filter));
    return [parsedQuery];
  } catch (error) {
    return [];
  }
};
