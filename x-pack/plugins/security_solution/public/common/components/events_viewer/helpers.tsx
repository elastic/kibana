/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '../../../../common/types';
import type { CombineQueries } from '../../lib/kuery';
import { buildTimeRangeFilter, combineQueries } from '../../lib/kuery';

import { EVENTS_TABLE_CLASS_NAME } from './styles';
import type { ViewSelection } from './summary_view_select';

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

export const isSelectableView = (tableId: string): boolean =>
  tableId === TableId.alertsOnAlertsPage || tableId === TableId.alertsOnRuleDetailsPage;

export const isViewSelection = (value: unknown): value is ViewSelection =>
  value === 'gridView' || value === 'eventRenderedView';

/** always returns a valid default `ViewSelection` */
export const getDefaultViewSelection = ({
  tableId,
  value,
}: {
  tableId: string;
  value: unknown;
}): ViewSelection => {
  const defaultViewSelection = 'gridView';

  if (!isSelectableView(tableId)) {
    return defaultViewSelection;
  } else {
    return isViewSelection(value) ? value : defaultViewSelection;
  }
};
