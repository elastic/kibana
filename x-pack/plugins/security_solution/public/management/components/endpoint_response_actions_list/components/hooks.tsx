/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import { ExperimentalFeaturesService } from '../../../../common/experimental_features_service';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTION_STATUS,
  RESPONSE_ACTION_TYPE,
  RESPONSE_CONSOLE_COMMAND_TO_API_COMMAND_MAP,
  type ResponseActionStatus,
} from '../../../../../common/endpoint/service/response_actions/constants';
import type { DateRangePickerValues } from './actions_log_date_range_picker';
import type { FILTER_NAMES } from '../translations';
import { FILTER_TYPE_OPTIONS, UX_MESSAGES } from '../translations';
import { ResponseActionStatusBadge } from './response_action_status_badge';
import { useActionHistoryUrlParams } from './use_action_history_url_params';
import { useGetEndpointsList } from '../../../hooks/endpoint/use_get_endpoints_list';

export const DEFAULT_DATE_RANGE_OPTIONS = Object.freeze({
  autoRefreshOptions: {
    enabled: false,
    duration: 10000,
  },
  startDate: 'now-24h/h',
  endDate: 'now',
  recentlyUsedDateRanges: [],
});

export const useDateRangePicker = (isFlyout: boolean) => {
  const {
    setUrlDateRangeFilters,
    startDate: startDateFromUrl,
    endDate: endDateFromUrl,
  } = useActionHistoryUrlParams();
  const [dateRangePickerState, setDateRangePickerState] = useState<DateRangePickerValues>({
    ...DEFAULT_DATE_RANGE_OPTIONS,
    startDate: isFlyout
      ? DEFAULT_DATE_RANGE_OPTIONS.startDate
      : startDateFromUrl ?? DEFAULT_DATE_RANGE_OPTIONS.startDate,
    endDate: isFlyout
      ? DEFAULT_DATE_RANGE_OPTIONS.endDate
      : endDateFromUrl ?? DEFAULT_DATE_RANGE_OPTIONS.endDate,
  });

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

      // update URL params for date filters
      if (!isFlyout) {
        setUrlDateRangeFilters({ startDate: newStart, endDate: newEnd });
      }
    },
    [
      dateRangePickerState.recentlyUsedDateRanges,
      isFlyout,
      setUrlDateRangeFilters,
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
  'data-test-subj': string;
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

export type FilterName = keyof typeof FILTER_NAMES;
export const useActionsLogFilter = ({
  filterName,
  isFlyout,
  isPopoverOpen,
  searchString,
}: {
  filterName: FilterName;
  isFlyout: boolean;
  isPopoverOpen: boolean;
  searchString: string;
}): {
  areHostsSelectedOnMount: boolean;
  isLoading: boolean;
  items: FilterItems;
  setItems: React.Dispatch<React.SetStateAction<FilterItems>>;
  hasActiveFilters: boolean;
  numActiveFilters: number;
  numFilters: number;
  setAreHostsSelectedOnMount: (value: React.SetStateAction<boolean>) => void;
  setUrlActionsFilters: ReturnType<typeof useActionHistoryUrlParams>['setUrlActionsFilters'];
  setUrlHostsFilters: ReturnType<typeof useActionHistoryUrlParams>['setUrlHostsFilters'];
  setUrlStatusesFilters: ReturnType<typeof useActionHistoryUrlParams>['setUrlStatusesFilters'];
  setUrlTypeFilters: ReturnType<typeof useActionHistoryUrlParams>['setUrlTypeFilters'];
} => {
  const {
    commands,
    statuses,
    hosts: selectedAgentIdsFromUrl,
    types = [],
    setUrlActionsFilters,
    setUrlHostsFilters,
    setUrlStatusesFilters,
    setUrlTypeFilters,
  } = useActionHistoryUrlParams();
  const isStatusesFilter = filterName === 'statuses';
  const isHostsFilter = filterName === 'hosts';
  const isTypeFilter = filterName === 'type';
  const { data: endpointsList, isFetching } = useGetEndpointsList({
    searchString,
    selectedAgentIds: selectedAgentIdsFromUrl,
  });

  // track the state of selected hosts via URL
  //  when the page is loaded via selected hosts on URL
  const [areHostsSelectedOnMount, setAreHostsSelectedOnMount] = useState<boolean>(false);
  useEffect(() => {
    if (selectedAgentIdsFromUrl && selectedAgentIdsFromUrl.length > 0) {
      setAreHostsSelectedOnMount(true);
    }
    // don't sync with changes to further selectedAgentIdsFromUrl
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // filter options
  const [items, setItems] = useState<FilterItems>(
    isTypeFilter
      ? RESPONSE_ACTION_TYPE.map((type) => ({
          key: type,
          label: getTypeDisplayName(type),
          checked: !isFlyout && types?.includes(type) ? 'on' : undefined,
          'data-test-subj': `${filterName}-filter-option`,
        }))
      : isStatusesFilter
      ? RESPONSE_ACTION_STATUS.map((statusName) => ({
          key: statusName,
          label: (
            <ResponseActionStatusBadge
              color={
                statusName === 'successful'
                  ? 'success'
                  : statusName === 'failed'
                  ? 'danger'
                  : 'warning'
              }
              status={getActionStatus(statusName)}
            />
          ) as unknown as string,
          checked: !isFlyout && statuses?.includes(statusName) ? 'on' : undefined,
          'data-test-subj': `${filterName}-filter-option`,
        }))
      : isHostsFilter
      ? []
      : RESPONSE_ACTION_API_COMMANDS_NAMES.filter((commandName) => {
          const featureFlags = ExperimentalFeaturesService.get();

          // upload - v8.9
          if (commandName === 'upload' && !featureFlags.responseActionUploadEnabled) {
            return false;
          }

          return true;
        }).map((commandName) => ({
          key: commandName,
          label: RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[commandName],
          checked:
            !isFlyout &&
            commands
              ?.map((command) => RESPONSE_CONSOLE_COMMAND_TO_API_COMMAND_MAP[command])
              .includes(commandName)
              ? 'on'
              : undefined,
          'data-test-subj': `${filterName}-filter-option`,
        }))
  );

  useEffect(() => {
    if (isHostsFilter && endpointsList) {
      setItems(
        endpointsList?.map((list) => ({
          key: list.id,
          label: list.name,
          checked: !isFlyout && list.selected ? 'on' : undefined,
          'data-test-subj': `${filterName}-filter-option`,
        }))
      );
    }
  }, [endpointsList, filterName, isFlyout, isHostsFilter, setItems]);

  const hasActiveFilters = useMemo(() => !!items.find((item) => item.checked === 'on'), [items]);
  const numActiveFilters = useMemo(
    () => items.filter((item) => item.checked === 'on').length,
    [items]
  );
  const numFilters = useMemo(() => items.filter((item) => item.checked !== 'on').length, [items]);

  return {
    areHostsSelectedOnMount,
    isLoading: isHostsFilter && isFetching,
    items,
    setItems,
    hasActiveFilters,
    numActiveFilters,
    numFilters,
    setAreHostsSelectedOnMount,
    setUrlActionsFilters,
    setUrlHostsFilters,
    setUrlStatusesFilters,
    setUrlTypeFilters,
  };
};

const getTypeDisplayName = (type: 'manual' | 'automated') => {
  if (type === 'automated') {
    return FILTER_TYPE_OPTIONS.automated;
  }
  return FILTER_TYPE_OPTIONS.manual;
};
