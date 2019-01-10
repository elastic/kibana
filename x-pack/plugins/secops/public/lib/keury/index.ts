/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { isString } from 'lodash/fp';
import { StaticIndexPattern } from 'ui/index_patterns';

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

export const escapeQueryValue = (val: number | string = ''): string | number => {
  if (isString(val)) {
    return val.replace(/"/g, '\\"');
  }

  return val;
};
