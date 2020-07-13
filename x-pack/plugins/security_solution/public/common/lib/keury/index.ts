/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, isString, flow } from 'lodash/fp';
import {
  EsQueryConfig,
  Query,
  Filter,
  esQuery,
  esKuery,
  IIndexPattern,
} from '../../../../../../../src/plugins/data/public';

import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';

import { KueryFilterQuery } from '../../store';

export const convertKueryToElasticSearchQuery = (
  kueryExpression: string,
  indexPattern?: IIndexPattern
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

export const convertKueryToDslFilter = (
  kueryExpression: string,
  indexPattern: IIndexPattern
): JsonObject => {
  try {
    return kueryExpression
      ? esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(kueryExpression), indexPattern)
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

export const isFromKueryExpressionValid = (kqlFilterQuery: KueryFilterQuery | null): boolean => {
  if (kqlFilterQuery && kqlFilterQuery.kind === 'kuery') {
    try {
      esKuery.fromKueryExpression(kqlFilterQuery.expression);
    } catch (err) {
      return false;
    }
  }
  return true;
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
  indexPattern: IIndexPattern;
  queries: Query[];
  filters: Filter[];
}) => {
  try {
    return JSON.stringify(
      esQuery.buildEsQuery(
        indexPattern,
        queries,
        filters.filter((f) => f.meta.disabled === false),
        {
          ...config,
          dateFormatTZ: undefined,
        }
      )
    );
  } catch (exp) {
    return '';
  }
};
