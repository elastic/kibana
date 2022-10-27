/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, EsQueryConfig, Query, DataViewBase } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { get, isEmpty } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import type { BrowserFields } from '../../../../common/search_strategy';
import type { DataProvider, DataProvidersAnd } from '../../../../common/types';
import { DataProviderType, EXISTS_OPERATOR, TableId } from '../../../../common/types';
import { convertToBuildEsQuery, escapeQueryValue } from '../../lib/kuery';
import type { ViewSelection } from '../event_rendered_view/selector';

import { EVENTS_TABLE_CLASS_NAME } from './styles';

interface CombineQueries {
  config: EsQueryConfig;
  dataProviders: DataProvider[];
  indexPattern: DataViewBase;
  browserFields: BrowserFields;
  filters: Filter[];
  kqlQuery: Query;
  kqlMode: string;
}

const isNumber = (value: string | number) => !isNaN(Number(value));

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

const convertNestedFieldToQuery = (
  field: string,
  value: string | number,
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

export const isDataProviderEmpty = (dataProviders: DataProvider[]) => {
  return isEmpty(dataProviders) || isEmpty(dataProviders.filter((d) => d.enabled === true));
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

export const getCombinedFilterQuery = ({
  from,
  to,
  filters,
  ...combineQueriesParams
}: CombineQueries & { from: string; to: string }): string | undefined => {
  const combinedQueries = combineQueries({
    ...combineQueriesParams,
    filters: [...filters, buildTimeRangeFilter(from, to)],
  });

  return combinedQueries ? combinedQueries.filterQuery : undefined;
};

export const resolverIsShowing = (graphEventId: string | undefined): boolean =>
  graphEventId != null && graphEventId !== '';

export const EVENTS_COUNT_BUTTON_CLASS_NAME = 'local-events-count-button';

/** Returns `true` when the element, or one of it's children has focus */
export const elementOrChildrenHasFocus = (element: HTMLElement | null | undefined): boolean =>
  element === document.activeElement || element?.querySelector(':focus-within') != null;

/** Returns true if the events table has focus */
export const tableHasFocus = (containerElement: HTMLElement | null): boolean =>
  elementOrChildrenHasFocus(
    containerElement?.querySelector<HTMLDivElement>(`.${EVENTS_TABLE_CLASS_NAME}`)
  );

export const isSelectableView = (timelineId: string): boolean =>
  timelineId === TableId.alertsOnAlertsPage || timelineId === TableId.alertsOnRuleDetailsPage;

export const isViewSelection = (value: unknown): value is ViewSelection =>
  value === 'gridView' || value === 'eventRenderedView';

/** always returns a valid default `ViewSelection` */
export const getDefaultViewSelection = ({
  timelineId,
  value,
}: {
  timelineId: string;
  value: unknown;
}): ViewSelection => {
  const defaultViewSelection = 'gridView';

  if (!isSelectableView(timelineId)) {
    return defaultViewSelection;
  } else {
    return isViewSelection(value) ? value : defaultViewSelection;
  }
};
