/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StaticIndexPattern } from 'ui/index_patterns';
import { fromKueryExpression, toElasticsearchQuery } from 'ui/kuery';

export const convertKueryToElasticSearchQuery = (
  kueryExpression: string,
  indexPattern: StaticIndexPattern
) => {
  try {
    return kueryExpression
      ? JSON.stringify(toElasticsearchQuery(fromKueryExpression(kueryExpression), indexPattern))
      : '';
  } catch (err) {
    return '';
  }
};
