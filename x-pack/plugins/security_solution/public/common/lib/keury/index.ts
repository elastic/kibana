/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isString } from 'lodash/fp';

import {
  EsQueryConfig,
  Query,
  Filter,
  buildEsQuery,
  toElasticsearchQuery,
  fromKueryExpression,
  IndexPatternBase,
  escapeKuery,
} from '@kbn/es-query';

export const convertKueryToElasticSearchQuery = (
  kueryExpression: string,
  indexPattern?: IndexPatternBase
) => {
  try {
    return kueryExpression
      ? JSON.stringify(toElasticsearchQuery(fromKueryExpression(kueryExpression), indexPattern))
      : '';
  } catch (err) {
    return '';
  }
};

export const convertKueryToDslFilter = (
  kueryExpression: string,
  indexPattern: IndexPatternBase
) => {
  try {
    return kueryExpression
      ? toElasticsearchQuery(fromKueryExpression(kueryExpression), indexPattern)
      : {};
  } catch (err) {
    return {};
  }
};

export const escapeQueryValue = (val: number | string = ''): string | number => {
  if (isString(val)) {
    if (isEmpty(val)) {
      return '""';
    }
    return `"${escapeKuery(val)}"`;
  }

  return val;
};

export const convertToBuildEsQuery = ({
  config,
  indexPattern,
  queries,
  filters,
}: {
  config: EsQueryConfig;
  indexPattern: IndexPatternBase;
  queries: Query[];
  filters: Filter[];
}): [string, undefined] | [undefined, Error] => {
  try {
    return [
      JSON.stringify(
        buildEsQuery(
          indexPattern,
          queries,
          filters.filter((f) => f.meta.disabled === false),
          {
            ...config,
            dateFormatTZ: undefined,
          }
        )
      ),
      undefined,
    ];
  } catch (error) {
    return [undefined, error];
  }
};
