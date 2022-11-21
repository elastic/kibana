/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, EsQueryConfig, Query, DataViewBase } from '@kbn/es-query';
import {
  fromKueryExpression,
  toElasticsearchQuery,
  FilterStateStore,
  buildEsQuery,
} from '@kbn/es-query';
import { flow, get, isEmpty, isString } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import type { BrowserFields } from '../../../../common/search_strategy';
import type { DataProvider, DataProvidersAnd } from '../../../../common/types';
import { DataProviderType, EXISTS_OPERATOR } from '../../../../common/types';

export interface CombineQueries {
  config: EsQueryConfig;
  dataProviders: DataProvider[];
  indexPattern: DataViewBase;
  browserFields: BrowserFields;
  filters: Filter[];
  kqlQuery: Query;
  kqlMode: string;
}

export const escapeQueryValue = (
  val: string | number | Array<string | number> = ''
): string | number | Array<string | number> => {
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

const isNumber = (value: string | number | Array<string | number>) => !isNaN(Number(value));

const convertDateFieldToQuery = (field: string, value: string | number | Array<string | number>) =>
  `${field}: ${isNumber(value) ? value : new Date(value.toString()).valueOf()}`;

const getBaseFields = memoizeOne((browserFields: BrowserFields): string[] => {
  const baseFields = get('base', browserFields);
  if (baseFields != null && baseFields.fields != null) {
    return Object.keys(baseFields.fields);
  }
  return [];
});

const getBrowserFieldPath = (field: string, browserFields: BrowserFields) => {
  const splitFields = field.split('.');
  const baseFields = getBaseFields(browserFields);
  if (baseFields.includes(field)) {
    return ['base', 'fields', field];
  }
  return [splitFields[0], 'fields', field];
};

const checkIfFieldTypeIsDate = (field: string, browserFields: BrowserFields) => {
  const pathBrowserField = getBrowserFieldPath(field, browserFields);
  const browserField = get(pathBrowserField, browserFields);
  if (browserField != null && browserField.type === 'date') {
    return true;
  }
  return false;
};

const convertNestedFieldToQuery = (
  field: string,
  value: string | number | Array<string | number>,
  browserFields: BrowserFields
) => {
  const pathBrowserField = getBrowserFieldPath(field, browserFields);
  const browserField = get(pathBrowserField, browserFields);
  const nestedPath = browserField.subType.nested.path;
  const key = field.replace(`${nestedPath}.`, '');
  return `${nestedPath}: { ${key}: ${browserField.type === 'date' ? `"${value}"` : value} }`;
};

const convertNestedFieldToExistQuery = (field: string, browserFields: BrowserFields) => {
  const pathBrowserField = getBrowserFieldPath(field, browserFields);
  const browserField = get(pathBrowserField, browserFields);
  const nestedPath = browserField.subType.nested.path;
  const key = field.replace(`${nestedPath}.`, '');
  return `${nestedPath}: { ${key}: * }`;
};

const checkIfFieldTypeIsNested = (field: string, browserFields: BrowserFields) => {
  const pathBrowserField = getBrowserFieldPath(field, browserFields);
  const browserField = get(pathBrowserField, browserFields);
  if (browserField != null && browserField.subType && browserField.subType.nested) {
    return true;
  }
  return false;
};

const buildQueryMatch = (
  dataProvider: DataProvider | DataProvidersAnd,
  browserFields: BrowserFields
) =>
  `${dataProvider.excluded ? 'NOT ' : ''}${
    dataProvider.queryMatch.operator !== EXISTS_OPERATOR &&
    dataProvider.type !== DataProviderType.template
      ? checkIfFieldTypeIsNested(dataProvider.queryMatch.field, browserFields)
        ? convertNestedFieldToQuery(
            dataProvider.queryMatch.field,
            dataProvider.queryMatch.value,
            browserFields
          )
        : checkIfFieldTypeIsDate(dataProvider.queryMatch.field, browserFields)
        ? convertDateFieldToQuery(dataProvider.queryMatch.field, dataProvider.queryMatch.value)
        : `${dataProvider.queryMatch.field} : ${
            isNumber(dataProvider.queryMatch.value)
              ? dataProvider.queryMatch.value
              : escapeQueryValue(dataProvider.queryMatch.value)
          }`
      : checkIfFieldTypeIsNested(dataProvider.queryMatch.field, browserFields)
      ? convertNestedFieldToExistQuery(dataProvider.queryMatch.field, browserFields)
      : `${dataProvider.queryMatch.field} ${EXISTS_OPERATOR}`
  }`.trim();

export const buildGlobalQuery = (dataProviders: DataProvider[], browserFields: BrowserFields) =>
  dataProviders
    .reduce((queries: string[], dataProvider: DataProvider) => {
      const flatDataProviders = [dataProvider, ...dataProvider.and];
      const activeDataProviders = flatDataProviders.filter(
        (flatDataProvider) => flatDataProvider.enabled
      );

      if (!activeDataProviders.length) return queries;

      const activeDataProvidersQueries = activeDataProviders.map((activeDataProvider) =>
        buildQueryMatch(activeDataProvider, browserFields)
      );

      const activeDataProvidersQueryMatch = activeDataProvidersQueries.join(' and ');

      return [...queries, activeDataProvidersQueryMatch];
    }, [])
    .filter((queriesItem) => !isEmpty(queriesItem))
    .reduce((globalQuery: string, queryMatch: string, index: number, queries: string[]) => {
      if (queries.length <= 1) return queryMatch;

      return !index ? `(${queryMatch})` : `${globalQuery} or (${queryMatch})`;
    }, '');

export const buildTimeRangeFilter = (from: string, to: string): Filter =>
  ({
    range: {
      '@timestamp': {
        gte: from,
        lt: to,
        format: 'strict_date_optional_time',
      },
    },
    meta: {
      type: 'range',
      disabled: false,
      negate: false,
      alias: null,
      key: '@timestamp',
      params: {
        gte: from,
        lt: to,
        format: 'strict_date_optional_time',
      },
    },
    $state: {
      store: FilterStateStore.APP_STATE,
    },
  } as Filter);

export const isDataProviderEmpty = (dataProviders: DataProvider[]) => {
  return isEmpty(dataProviders) || isEmpty(dataProviders.filter((d) => d.enabled === true));
};

export const convertToBuildEsQuery = ({
  config,
  indexPattern,
  queries,
  filters,
}: {
  config: EsQueryConfig;
  indexPattern: DataViewBase | undefined;
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
            nestedIgnoreUnmapped: true, // by default, prevent shard failures when unmapped `nested` fields are queried: https://github.com/elastic/kibana/issues/130340
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

export const combineQueries = ({
  config,
  dataProviders,
  indexPattern,
  browserFields,
  filters = [],
  kqlQuery,
  kqlMode,
}: CombineQueries): { filterQuery: string | undefined; kqlError: Error | undefined } | null => {
  const kuery: Query = { query: '', language: kqlQuery.language };
  if (isDataProviderEmpty(dataProviders) && isEmpty(kqlQuery.query) && isEmpty(filters)) {
    return null;
  } else if (isDataProviderEmpty(dataProviders) && isEmpty(kqlQuery.query) && !isEmpty(filters)) {
    const [filterQuery, kqlError] = convertToBuildEsQuery({
      config,
      queries: [kuery],
      indexPattern,
      filters,
    });

    return {
      filterQuery,
      kqlError,
    };
  }

  const operatorKqlQuery = kqlMode === 'filter' ? 'and' : 'or';

  const postpend = (q: string) => `${!isEmpty(q) ? `(${q})` : ''}`;

  const globalQuery = buildGlobalQuery(dataProviders, browserFields); // based on Data Providers

  const querySuffix = postpend(kqlQuery.query as string); // based on Unified Search bar

  const queryPrefix = globalQuery ? `(${globalQuery})` : '';

  const queryOperator = queryPrefix && querySuffix ? operatorKqlQuery : '';

  kuery.query = `(${queryPrefix} ${queryOperator} ${querySuffix})`;

  const [filterQuery, kqlError] = convertToBuildEsQuery({
    config,
    queries: [kuery],
    indexPattern,
    filters,
  });

  return {
    filterQuery,
    kqlError,
  };
};
