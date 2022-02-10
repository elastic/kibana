/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isString, flow } from 'lodash/fp';

import {
  EsQueryConfig,
  Query,
  Filter,
  buildEsQuery,
  toElasticsearchQuery,
  fromKueryExpression,
  DataViewBase,
} from '@kbn/es-query';

export const convertKueryToElasticSearchQuery = (
  kueryExpression: string,
  indexPattern?: DataViewBase
) => {
  try {
    return kueryExpression
      ? JSON.stringify(toElasticsearchQuery(fromKueryExpression(kueryExpression), indexPattern))
      : '';
  } catch (err) {
    return '';
  }
};

export const convertKueryToDslFilter = (kueryExpression: string, indexPattern: DataViewBase) => {
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

const escapeWhitespace = (val: string) =>
  val.replace(/\t/g, '\\t').replace(/\r/g, '\\r').replace(/\n/g, '\\n');

// See the SpecialCharacter rule in kuery.peg
const escapeSpecialCharacters = (val: string) => val.replace(/["]/g, '\\$&'); // $& means the whole matched string

// See the Keyword rule in kuery.peg
// I do not think that we need that anymore since we are doing a full match_phrase all the time now => return `"${escapeKuery(val)}"`;
// const escapeAndOr = (val: string) => val.replace(/(\s+)(and|or)(\s+)/gi, '$1\\$2$3');

// const escapeNot = (val: string) => val.replace(/not(\s+)/gi, '\\$&');

export const escapeKuery = flow(escapeSpecialCharacters, escapeWhitespace);

export const convertToBuildEsQuery = ({
  config,
  indexPattern,
  queries,
  filters,
}: {
  config: EsQueryConfig;
  indexPattern: DataViewBase;
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
