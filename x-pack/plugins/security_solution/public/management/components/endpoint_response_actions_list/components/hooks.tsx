/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import type { DateRangePickerValues } from './action_list_date_range_picker';
import { useGetKibanaUsers } from '../../../hooks/endpoint/use_get_kibana_users';
import { RESPONSE_ACTION_COMMANDS } from '../../../../../common/endpoint/types';

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

export const useActionListFilter = (filterName: string) => {
  const isUsersFilter = filterName === 'users';
  const { data: users } = useGetKibanaUsers({ enabled: isUsersFilter });
  const [items, setItems] = useState<FilterItems>(
    isUsersFilter
      ? []
      : RESPONSE_ACTION_COMMANDS.slice().map((filter) => ({
          key: filter,
          label: filter === 'unisolate' ? 'release' : filter,
          checked: undefined,
        }))
  );

  useEffect(() => {
    if (isUsersFilter && users) {
      setItems(
        users.map((filter) => ({
          key: filter.username,
          label: filter.username,
          checked: undefined,
        }))
      );
    }
  }, [filterName, isUsersFilter, setItems, users]);

  const hasActiveFilters = useMemo(() => !!items.find((item) => item.checked === 'on'), [items]);
  const numActiveFilters = useMemo(
    () => items.filter((item) => item.checked === 'on').length,
    [items]
  );
  const numFilters = useMemo(() => items.filter((item) => item.checked !== 'on').length, [items]);

  return { items, setItems, hasActiveFilters, numActiveFilters, numFilters };
};
