/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import type {
  ResponseActions,
  ResponseActionStatus,
} from '../../../../../common/endpoint/service/response_actions/constants';
import {
  RESPONSE_ACTION_COMMANDS,
  RESPONSE_ACTION_STATUS,
} from '../../../../../common/endpoint/service/response_actions/constants';
import type { DateRangePickerValues } from './actions_log_date_range_picker';
import type { FILTER_NAMES } from '../translations';
import { UX_MESSAGES } from '../translations';
import { StatusBadge } from './status_badge';

const defaultDateRangeOptions = Object.freeze({
  autoRefreshOptions: {
    enabled: false,
    duration: 10000,
  },
  startDate: 'now-24h/h',
  endDate: 'now',
  recentlyUsedDateRanges: [],
});

export const useDateRangePicker = () => {
  const [dateRangePickerState, setDateRangePickerState] =
    useState<DateRangePickerValues>(defaultDateRangeOptions);

  const updateActionListDateRanges = useCallback(
    ({ start, end }) => {
      setDateRangePickerState((prevState) => ({
        ...prevState,
        startDate: start,
        endDate: end,
      }));
    },
    [setDateRangePickerState]
  );

  const updateActionListRecentlyUsedDateRanges = useCallback(
    (recentlyUsedDateRanges) => {
      setDateRangePickerState((prevState) => ({
        ...prevState,
        recentlyUsedDateRanges,
      }));
    },
    [setDateRangePickerState]
  );

  // handle refresh timer update
  const onRefreshChange = useCallback(
    (evt: OnRefreshChangeProps) => {
      setDateRangePickerState((prevState) => ({
        ...prevState,
        autoRefreshOptions: { enabled: !evt.isPaused, duration: evt.refreshInterval },
      }));
    },
    [setDateRangePickerState]
  );

  // handle manual time change on date picker
  const onTimeChange = useCallback(
    ({ start: newStart, end: newEnd }: DurationRange) => {
      // update date ranges
      updateActionListDateRanges({ start: newStart, end: newEnd });

      // update recently used date ranges
      const newRecentlyUsedDateRanges = [
        { start: newStart, end: newEnd },
        ...dateRangePickerState.recentlyUsedDateRanges
          .filter(
            (recentlyUsedRange: DurationRange) =>
              !(recentlyUsedRange.start === newStart && recentlyUsedRange.end === newEnd)
          )
          .slice(0, 9),
      ];
      updateActionListRecentlyUsedDateRanges(newRecentlyUsedDateRanges);
    },
    [
      dateRangePickerState.recentlyUsedDateRanges,
      updateActionListDateRanges,
      updateActionListRecentlyUsedDateRanges,
    ]
  );

  return { dateRangePickerState, onRefreshChange, onTimeChange };
};

export type FilterItems = Array<{
  key: string;
  label: string;
  checked: 'on' | undefined;
}>;

export const getActionStatus = (status: ResponseActionStatus): string => {
  if (status === 'failed') {
    return UX_MESSAGES.badge.failed;
  } else if (status === 'successful') {
    return UX_MESSAGES.badge.successful;
  } else if (status === 'pending') {
    return UX_MESSAGES.badge.pending;
  }
  return '';
};

export const getCommand = (
  command: ResponseActions
): Exclude<ResponseActions, 'unisolate' | 'running-processes'> | 'release' | 'processes' =>
  command === 'unisolate' ? 'release' : command === 'running-processes' ? 'processes' : command;

// TODO: add more filter names here
export type FilterName = keyof typeof FILTER_NAMES;
export const useActionsLogFilter = (
  filterName: FilterName
): {
  items: FilterItems;
  setItems: React.Dispatch<React.SetStateAction<FilterItems>>;
  hasActiveFilters: boolean;
  numActiveFilters: number;
  numFilters: number;
} => {
  const isStatusesFilter = filterName === 'statuses';
  const [items, setItems] = useState<FilterItems>(
    isStatusesFilter
      ? RESPONSE_ACTION_STATUS.map((filter) => ({
          key: filter,
          label: (
            <StatusBadge
              color={
                filter === 'successful' ? 'success' : filter === 'failed' ? 'danger' : 'warning'
              }
              status={getActionStatus(filter)}
            />
          ) as unknown as string,
          checked: undefined,
        }))
      : RESPONSE_ACTION_COMMANDS.map((filter) => ({
          key: filter,
          label: getCommand(filter),
          checked: undefined,
        }))
  );

  const hasActiveFilters = useMemo(() => !!items.find((item) => item.checked === 'on'), [items]);
  const numActiveFilters = useMemo(
    () => items.filter((item) => item.checked === 'on').length,
    [items]
  );
  const numFilters = useMemo(() => items.filter((item) => item.checked !== 'on').length, [items]);

  return { items, setItems, hasActiveFilters, numActiveFilters, numFilters };
};
