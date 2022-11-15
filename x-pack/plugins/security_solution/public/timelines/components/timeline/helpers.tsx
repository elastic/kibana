/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, get } from 'lodash/fp';
import memoizeOne from 'memoize-one';

import {
  elementOrChildrenHasFocus,
  getFocusedAriaColindexCell,
  getTableSkipFocus,
  handleSkipFocus,
  stopPropagationAndPreventDefault,
} from '@kbn/timelines-plugin/public';

import { assertUnreachable } from '../../../../common/utility_types';
import type { BrowserFields } from '../../../common/containers/source';
import { escapeQueryValue } from '../../../common/lib/kuery';
import type { DataProvider, DataProvidersAnd } from './data_providers/data_provider';
import {
  DataProviderType,
  EXISTS_OPERATOR,
  IS_ONE_OF_OPERATOR,
  IS_OPERATOR,
} from './data_providers/data_provider';
import { EVENTS_TABLE_CLASS_NAME } from './styles';

const isNumber = (value: string | number): value is number => !isNaN(Number(value));

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
) => {
  const {
    excluded,
    type,
    queryMatch: { field, operator, value },
  } = dataProvider;

  const isFieldTypeNested = checkIfFieldTypeIsNested(field, browserFields);
  const isExcluded = excluded ? 'NOT ' : '';

  switch (operator) {
    case IS_OPERATOR:
      return handleIsOperator({ browserFields, field, isExcluded, isFieldTypeNested, type, value });

    case EXISTS_OPERATOR:
      return `${isExcluded}${buildExistsQueryMatch({ browserFields, field, isFieldTypeNested })}`;

    case IS_ONE_OF_OPERATOR:
      return handleIsOneOfOperator({ field, isExcluded, value });

    default:
      assertUnreachable(operator);
  }
};

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

interface OperatorHandler {
  field: string;
  isExcluded: string;
  value: string | number | Array<string | number>;
}

export const handleIsOperator = ({
  browserFields,
  field,
  isExcluded,
  isFieldTypeNested,
  type,
  value,
}: OperatorHandler & {
  browserFields: BrowserFields;
  isFieldTypeNested: boolean;
  type?: DataProviderType;
}) => {
  if (!isStringOrNumberArray(value)) {
    return `${isExcluded}${
      type !== DataProviderType.template
        ? buildIsQueryMatch({ browserFields, field, isFieldTypeNested, value })
        : buildExistsQueryMatch({ browserFields, field, isFieldTypeNested })
    }`;
  } else {
    return `${isExcluded}${field} : ${JSON.stringify(value)}`;
  }
};

const handleIsOneOfOperator = ({ field, isExcluded, value }: OperatorHandler) => {
  if (isStringOrNumberArray(value)) {
    return `${isExcluded}${buildIsOneOfQueryMatch({ field, value })}`;
  } else {
    return `${isExcluded}${field} : ${JSON.stringify(value)}`;
  }
};

export const buildIsQueryMatch = ({
  browserFields,
  field,
  isFieldTypeNested,
  value,
}: {
  browserFields: BrowserFields;
  field: string;
  isFieldTypeNested: boolean;
  value: string | number;
}): string => {
  if (isFieldTypeNested) {
    return convertNestedFieldToQuery(field, value, browserFields);
  } else if (checkIfFieldTypeIsDate(field, browserFields)) {
    return convertDateFieldToQuery(field, value);
  } else {
    return `${field} : ${isNumber(value) ? value : escapeQueryValue(value)}`;
  }
};

export const buildExistsQueryMatch = ({
  browserFields,
  field,
  isFieldTypeNested,
}: {
  browserFields: BrowserFields;
  field: string;
  isFieldTypeNested: boolean;
}): string => {
  return isFieldTypeNested
    ? convertNestedFieldToExistQuery(field, browserFields).trim()
    : `${field} ${EXISTS_OPERATOR}`.trim();
};

export const buildIsOneOfQueryMatch = ({
  field,
  value,
}: {
  field: string;
  value: Array<string | number>;
}): string => {
  const trimmedField = field.trim();
  if (value.length) {
    return `${trimmedField} : (${value
      .map((item) => (isNumber(item) ? Number(item) : `${escapeQueryValue(item.trim())}`))
      .join(' OR ')})`;
  }
  return `${trimmedField} : ''`;
};

export const isStringOrNumberArray = (value: unknown): value is Array<string | number> =>
  Array.isArray(value) &&
  (value.every((x) => typeof x === 'string') || value.every((x) => typeof x === 'number'));
