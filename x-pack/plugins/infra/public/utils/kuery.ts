/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { DataViewBase } from '@kbn/es-query';

export const convertKueryToElasticSearchQuery = (
  kueryExpression: string,
  indexPattern: DataViewBase,
  swallowErrors: boolean = true
) => {
  try {
    return kueryExpression
      ? JSON.stringify(toElasticsearchQuery(fromKueryExpression(kueryExpression), indexPattern))
      : '';
  } catch (err) {
    if (swallowErrors) {
      return '';
    } else throw err;
  }
};
