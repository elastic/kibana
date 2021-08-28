/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IIndexPattern } from '../../../../../src/plugins/data/common/index_patterns/types';
import { esKuery } from '../../../../../src/plugins/data/public/deprecated';

export const convertKueryToElasticSearchQuery = (
  kueryExpression: string,
  indexPattern: IIndexPattern
) => {
  try {
    return kueryExpression
      ? JSON.stringify(
          esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(kueryExpression), indexPattern)
        )
      : '';
  } catch (err) {
    return '';
  }
};
