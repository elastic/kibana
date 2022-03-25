/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, EsQueryConfig, Query } from '@kbn/es-query';
import { DataViewBase, FilterStateStore } from '@kbn/es-query';
import { isEmpty, get } from 'lodash/fp';
import memoizeOne from 'memoize-one';
import {
  elementOrChildrenHasFocus,
  getFocusedAriaColindexCell,
  getTableSkipFocus,
  handleSkipFocus,
  stopPropagationAndPreventDefault,
} from '../../../common/utils/accessibility';
import type { BrowserFields } from '../../../common/search_strategy/index_fields';
import { DataProviderType, EXISTS_OPERATOR } from '../../../common/types/timeline';
import type { DataProvider, DataProvidersAnd } from '../../../common/types/timeline';
import { convertToBuildEsQuery, escapeQueryValue } from '../utils/keury';

import { EVENTS_TABLE_CLASS_NAME } from './styles';

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

interface CombineQueries {
  config: EsQueryConfig;
  dataProviders: DataProvider[];
  indexPattern: DataViewBase;
  browserFields: BrowserFields;
  filters: Filter[];
  kqlQuery: Query;
  kqlMode: string;
  isEventViewer?: boolean;
}

export const combineQueries = ({
  config,
  dataProviders,
  indexPattern,
  browserFields,
  filters = [],
  kqlQuery,
  kqlMode,
  isEventViewer,
}: CombineQueries): { filterQuery: string } | null => {
  const kuery: Query = { query: '', language: kqlQuery.language };
  if (isEmpty(dataProviders) && isEmpty(kqlQuery.query) && isEmpty(filters) && !isEventViewer) {
    return null;
  } else if (isEmpty(dataProviders) && isEmpty(kqlQuery.query) && isEventViewer) {
    return {
      filterQuery: convertToBuildEsQuery({ config, queries: [kuery], indexPattern, filters }),
    };
  } else if (isEmpty(dataProviders) && isEmpty(kqlQuery.query) && !isEmpty(filters)) {
    return {
      filterQuery: convertToBuildEsQuery({ config, queries: [kuery], indexPattern, filters }),
    };
  } else if (isEmpty(dataProviders) && !isEmpty(kqlQuery.query)) {
    kuery.query = `(${kqlQuery.query})`;
    return {
      filterQuery: convertToBuildEsQuery({ config, queries: [kuery], indexPattern, filters }),
    };
  } else if (!isEmpty(dataProviders) && isEmpty(kqlQuery)) {
    kuery.query = `(${buildGlobalQuery(dataProviders, browserFields)})`;
    return {
      filterQuery: convertToBuildEsQuery({ config, queries: [kuery], indexPattern, filters }),
    };
  }
  const operatorKqlQuery = kqlMode === 'filter' ? 'and' : 'or';
  const postpend = (q: string) => `${!isEmpty(q) ? ` ${operatorKqlQuery} (${q})` : ''}`;
  kuery.query = `((${buildGlobalQuery(dataProviders, browserFields)})${postpend(
    kqlQuery.query as string
  )})`;
  return {
    filterQuery: convertToBuildEsQuery({ config, queries: [kuery], indexPattern, filters }),
  };
};

export const buildCombinedQuery = (combineQueriesParams: CombineQueries) => {
  const combinedQuery = combineQueries(combineQueriesParams);
  return combinedQuery?.filterQuery
    ? {
        filterQuery: combinedQuery.filterQuery,
      }
    : null;
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

/**
 * The CSS class name of a "stateful event", which appears in both
 * the `Timeline` and the `Events Viewer` widget
 */
export const STATEFUL_EVENT_CSS_CLASS_NAME = 'event-column-view';

export const resolverIsShowing = (graphEventId: string | undefined): boolean =>
  graphEventId != null && graphEventId !== '';

export const showGlobalFilters = ({
  globalFullScreen,
  graphEventId,
}: {
  globalFullScreen: boolean;
  graphEventId: string | undefined;
}): boolean => (globalFullScreen && resolverIsShowing(graphEventId) ? false : true);

/**
 * The `aria-colindex` of the Timeline actions column
 */
export const ACTIONS_COLUMN_ARIA_COL_INDEX = '1';

/**
 * Every column index offset by `2`, because, per https://www.w3.org/TR/wai-aria-practices-1.1/examples/grid/dataGrids.html
 * the `aria-colindex` attribute starts at `1`, and the "actions column" is always the first column
 */
export const ARIA_COLUMN_INDEX_OFFSET = 2;

export const EVENTS_COUNT_BUTTON_CLASS_NAME = 'local-events-count-button';

/** Calculates the total number of pages in a (timeline) events view */
export const calculateTotalPages = ({
  itemsCount,
  itemsPerPage,
}: {
  itemsCount: number;
  itemsPerPage: number;
}): number => (itemsCount === 0 || itemsPerPage === 0 ? 0 : Math.ceil(itemsCount / itemsPerPage));

/** Returns true if the events table has focus */
export const tableHasFocus = (containerElement: HTMLElement | null): boolean =>
  elementOrChildrenHasFocus(
    containerElement?.querySelector<HTMLDivElement>(`.${EVENTS_TABLE_CLASS_NAME}`)
  );

/**
 * This function has a side effect. It will skip focus "after" or "before"
 * Timeline's events table, with exceptions as noted below.
 *
 * If the currently-focused table cell has additional focusable children,
 * i.e. action buttons, draggables, or always-open popover content, the
 * browser's "natural" focus management will determine which element is
 * focused next.
 */
export const onTimelineTabKeyPressed = ({
  containerElement,
  keyboardEvent,
  onSkipFocusBeforeEventsTable,
  onSkipFocusAfterEventsTable,
}: {
  containerElement: HTMLElement | null;
  keyboardEvent: React.KeyboardEvent;
  onSkipFocusBeforeEventsTable: () => void;
  onSkipFocusAfterEventsTable: () => void;
}) => {
  const { shiftKey } = keyboardEvent;

  const eventsTableSkipFocus = getTableSkipFocus({
    containerElement,
    getFocusedCell: getFocusedAriaColindexCell,
    shiftKey,
    tableHasFocus,
    tableClassName: EVENTS_TABLE_CLASS_NAME,
  });

  if (eventsTableSkipFocus !== 'SKIP_FOCUS_NOOP') {
    stopPropagationAndPreventDefault(keyboardEvent);
    handleSkipFocus({
      onSkipFocusBackwards: onSkipFocusBeforeEventsTable,
      onSkipFocusForward: onSkipFocusAfterEventsTable,
      skipFocus: eventsTableSkipFocus,
    });
  }
};

export const ACTIVE_TIMELINE_BUTTON_CLASS_NAME = 'active-timeline-button';
export const FLYOUT_BUTTON_BAR_CLASS_NAME = 'timeline-flyout-button-bar';
export const FLYOUT_BUTTON_CLASS_NAME = 'timeline-flyout-button';

/**
 * This function focuses the active timeline button on the next tick. Focus
 * is updated on the next tick because this function is typically
 * invoked in `onClick` handlers that also dispatch Redux actions (that
 * in-turn update focus states).
 */
export const focusActiveTimelineButton = () => {
  setTimeout(() => {
    document
      .querySelector<HTMLButtonElement>(
        `div.${FLYOUT_BUTTON_BAR_CLASS_NAME} .${ACTIVE_TIMELINE_BUTTON_CLASS_NAME}`
      )
      ?.focus();
  }, 0);
};

/**
 * Focuses the utility bar action contained by the provided `containerElement`
 * when a valid container is provided
 */
export const focusUtilityBarAction = (containerElement: HTMLElement | null) => {
  containerElement
    ?.querySelector<HTMLButtonElement>('div.siemUtilityBar__action:last-of-type button')
    ?.focus();
};

/**
 * Resets keyboard focus on the page
 */
export const resetKeyboardFocus = () => {
  document.querySelector<HTMLAnchorElement>('header.headerGlobalNav a.euiHeaderLogo')?.focus();
};
