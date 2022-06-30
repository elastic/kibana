/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import { useCallback, useState } from 'react';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import type { DateRangePickerValues } from './action_list_date_range_picker';

const defaultDateRangeOptions = Object.freeze({
  autoRefreshOptions: {
    enabled: false,
    duration: 10000,
  },
  startDate: 'now-1d',
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
        startDate: dateMath.parse(start)?.toISOString(),
        endDate: dateMath.parse(end)?.toISOString(),
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
      const newRecentlyUsedDateRanges = [
        { start: newStart, end: newEnd },
        ...dateRangePickerState.recentlyUsedDateRanges
          .filter(
            (recentlyUsedRange: DurationRange) =>
              !(recentlyUsedRange.start === newStart && recentlyUsedRange.end === newEnd)
          )
          .slice(0, 9),
      ];

      // update date ranges
      updateActionListDateRanges({ start: newStart, end: newEnd });
      // update recently used date ranges
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
