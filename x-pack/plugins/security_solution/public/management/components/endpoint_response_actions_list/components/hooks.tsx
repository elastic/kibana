/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import { ExperimentalFeaturesService } from '../../../../common/experimental_features_service';
import type {
  ConsoleResponseActionCommands,
  ResponseActionsApiCommandNames,
  ResponseActionStatus,
} from '../../../../../common/endpoint/service/response_actions/constants';
import {
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTION_STATUS,
} from '../../../../../common/endpoint/service/response_actions/constants';
import type { DateRangePickerValues } from './actions_log_date_range_picker';
import type { FILTER_NAMES } from '../translations';
import { UX_MESSAGES } from '../translations';
import { StatusBadge } from './status_badge';
import { useActionHistoryUrlParams } from './use_action_history_url_params';
import { useGetEndpointsList } from '../../../hooks/endpoint/use_get_endpoints_list';

const defaultDateRangeOptions = Object.freeze({
  autoRefreshOptions: {
    enabled: false,
    duration: 10000,
  },
  startDate: 'now-24h/h',
  endDate: 'now',
  recentlyUsedDateRanges: [],
});

export const useDateRangePicker = (isFlyout: boolean) => {
  const { setUrlDateRangeFilters } = useActionHistoryUrlParams();
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
  } else if (status === 'partial') {
    return UX_MESSAGES.badge.partial;
  } else if (status === 'successful') {
    return UX_MESSAGES.badge.successful;
  } else if (status === 'pending') {
    return UX_MESSAGES.badge.pending;
  }
  return '';
};

/**
 * map actual command to ui command
 * unisolate -> release
 * running-processes -> processes
 */
export const getUiCommand = (
  command: ResponseActionsApiCommandNames
): ConsoleResponseActionCommands => {
  if (command === 'unisolate') {
    return 'release';
  } else if (command === 'running-processes') {
    return 'processes';
  } else {
    return command;
  }
};

/**
 * map UI command back to actual command
 * release -> unisolate
 * processes -> running-processes
 */
export const getCommandKey = (
  uiCommand: ConsoleResponseActionCommands
): ResponseActionsApiCommandNames => {
  if (uiCommand === 'release') {
    return 'unisolate';
  } else if (uiCommand === 'processes') {
    return 'running-processes';
  } else {
    return uiCommand;
  }
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
} => {
  const {
    commands,
    statuses,
    hosts: selectedAgentIdsFromUrl,
    setUrlActionsFilters,
    setUrlHostsFilters,
    setUrlStatusesFilters,
  } = useActionHistoryUrlParams();
  const isStatusesFilter = filterName === 'statuses';
  const isHostsFilter = filterName === 'hosts';
  const { data: endpointsList, isFetching } = useGetEndpointsList({
    searchString,
    selectedAgentIds: selectedAgentIdsFromUrl,
  });

  // track state of selected hosts via URL
  // when page is loaded via selected hosts on URL
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
    isStatusesFilter
      ? RESPONSE_ACTION_STATUS.map((statusName) => ({
          key: statusName,
          label: (
            <StatusBadge
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
          // `get-file` is currently behind FF
          if (
            commandName === 'get-file' &&
            !ExperimentalFeaturesService.get().responseActionGetFileEnabled
          ) {
            return false;
          }

          return true;
        }).map((commandName) => ({
          key: commandName,
          label: getUiCommand(commandName),
          checked:
            !isFlyout && commands?.map((command) => getCommandKey(command)).includes(commandName)
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
  };
};
