/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, isNumber, get } from 'lodash/fp';
import memoizeOne from 'memoize-one';

import { escapeQueryValue, convertToBuildEsQuery } from '../../../common/lib/keury';

import { DataProvider, DataProvidersAnd, EXISTS_OPERATOR } from './data_providers/data_provider';
import { BrowserFields } from '../../../common/containers/source';
import {
  IIndexPattern,
  Query,
  EsQueryConfig,
  Filter,
} from '../../../../../../../src/plugins/data/public';

const convertDateFieldToQuery = (field: string, value: string | number) =>
  `${field}: ${isNumber(value) ? value : new Date(value).valueOf()}`;

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

const buildQueryMatch = (
  dataProvider: DataProvider | DataProvidersAnd,
  browserFields: BrowserFields
) =>
  `${dataProvider.excluded ? 'NOT ' : ''}${
    dataProvider.queryMatch.operator !== EXISTS_OPERATOR
      ? checkIfFieldTypeIsDate(dataProvider.queryMatch.field, browserFields)
        ? convertDateFieldToQuery(dataProvider.queryMatch.field, dataProvider.queryMatch.value)
        : `${dataProvider.queryMatch.field} : ${
            isNumber(dataProvider.queryMatch.value)
              ? dataProvider.queryMatch.value
              : escapeQueryValue(dataProvider.queryMatch.value)
          }`
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

export const combineQueries = ({
  config,
  dataProviders,
  indexPattern,
  browserFields,
  filters = [],
  kqlQuery,
  kqlMode,
  start,
  end,
  isEventViewer,
}: {
  config: EsQueryConfig;
  dataProviders: DataProvider[];
  indexPattern: IIndexPattern;
  browserFields: BrowserFields;
  filters: Filter[];
  kqlQuery: Query;
  kqlMode: string;
  start: number;
  end: number;
  isEventViewer?: boolean;
}): { filterQuery: string } | null => {
  const kuery: Query = { query: '', language: kqlQuery.language };
  if (isEmpty(dataProviders) && isEmpty(kqlQuery.query) && isEmpty(filters) && !isEventViewer) {
    return null;
  } else if (isEmpty(dataProviders) && isEmpty(kqlQuery.query) && isEventViewer) {
    kuery.query = `@timestamp >= ${start} and @timestamp <= ${end}`;
    return {
      filterQuery: convertToBuildEsQuery({ config, queries: [kuery], indexPattern, filters }),
    };
  } else if (isEmpty(dataProviders) && isEmpty(kqlQuery.query) && !isEmpty(filters)) {
    kuery.query = `@timestamp >= ${start} and @timestamp <= ${end}`;
    return {
      filterQuery: convertToBuildEsQuery({ config, queries: [kuery], indexPattern, filters }),
    };
  } else if (isEmpty(dataProviders) && !isEmpty(kqlQuery.query)) {
    kuery.query = `(${kqlQuery.query}) and @timestamp >= ${start} and @timestamp <= ${end}`;
    return {
      filterQuery: convertToBuildEsQuery({ config, queries: [kuery], indexPattern, filters }),
    };
  } else if (!isEmpty(dataProviders) && isEmpty(kqlQuery)) {
    kuery.query = `(${buildGlobalQuery(
      dataProviders,
      browserFields
    )}) and @timestamp >= ${start} and @timestamp <= ${end}`;
    return {
      filterQuery: convertToBuildEsQuery({ config, queries: [kuery], indexPattern, filters }),
    };
  }
  const operatorKqlQuery = kqlMode === 'filter' ? 'and' : 'or';
  const postpend = (q: string) => `${!isEmpty(q) ? ` ${operatorKqlQuery} (${q})` : ''}`;
  kuery.query = `((${buildGlobalQuery(dataProviders, browserFields)})${postpend(
    kqlQuery.query as string
  )}) and @timestamp >= ${start} and @timestamp <= ${end}`;
  return {
    filterQuery: convertToBuildEsQuery({ config, queries: [kuery], indexPattern, filters }),
  };
};

/**
 * The CSS class name of a "stateful event", which appears in both
 * the `Timeline` and the `Events Viewer` widget
 */
export const STATEFUL_EVENT_CSS_CLASS_NAME = 'event-column-view';

export const DEFAULT_ICON_BUTTON_WIDTH = 24;
