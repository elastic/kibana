/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewBase } from '@kbn/es-query';
import { esKuery } from '../../../../../src/plugins/data/public';

export const convertKueryToElasticSearchQuery = (
  kueryExpression: string,
  indexPattern: DataViewBase,
  swallowErrors: boolean = true
) => {
  try {
    return kueryExpression
      ? JSON.stringify(
          esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(kueryExpression), indexPattern)
        )
      : '';
  } catch (err) {
    if (swallowErrors) {
      return '';
    } else throw err;
  }
};
