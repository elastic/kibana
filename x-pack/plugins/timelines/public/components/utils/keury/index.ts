/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, DataViewBase, toElasticsearchQuery } from '@kbn/es-query';

export const convertKueryToDslFilter = (kueryExpression: string, indexPattern: DataViewBase) => {
  try {
    return kueryExpression
      ? toElasticsearchQuery(fromKueryExpression(kueryExpression), indexPattern)
      : {};
  } catch (err) {
    return {};
  }
};
