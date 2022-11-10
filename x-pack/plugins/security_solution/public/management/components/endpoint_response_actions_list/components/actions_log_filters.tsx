/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFilterGroup, EuiSuperUpdateButton } from '@elastic/eui';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import type { useGetEndpointActionList } from '../../../hooks';
import {
  type DateRangePickerValues,
  ActionLogDateRangePicker,
} from './actions_log_date_range_picker';
import { ActionsLogFilter } from './actions_log_filter';
import { ActionsLogUsersFilter } from './actions_log_users_filter';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export const ActionsLogFilters = memo(
  ({
    dateRangePickerState,
    isDataLoading,
    isFlyout,
    onClick,
    onChangeHostsFilter,
    onChangeCommandsFilter,
    onChangeStatusesFilter,
    onChangeUsersFilter,
    onRefresh,
    onRefreshChange,
    onTimeChange,
    showHostsFilter,
  }: {
    dateRangePickerState: DateRangePickerValues;
    isDataLoading: boolean;
    isFlyout: boolean;
    onChangeHostsFilter: (selectedCommands: string[]) => void;
    onChangeCommandsFilter: (selectedCommands: string[]) => void;
    onChangeStatusesFilter: (selectedStatuses: string[]) => void;
    onChangeUsersFilter: (selectedUsers: string[]) => void;
    onRefresh: () => void;
    onRefreshChange: (evt: OnRefreshChangeProps) => void;
    onTimeChange: ({ start, end }: DurationRange) => void;
    onClick: ReturnType<typeof useGetEndpointActionList>['refetch'];
    showHostsFilter: boolean;
  }) => {
    const getTestId = useTestIdGenerator('response-actions-list');
    const filters = useMemo(() => {
      return (
        <>
          {showHostsFilter && (
            <ActionsLogFilter
              filterName={'hosts'}
              isFlyout={isFlyout}
              onChangeFilterOptions={onChangeHostsFilter}
            />
          )}
          <ActionsLogFilter
            filterName={'actions'}
            isFlyout={isFlyout}
            onChangeFilterOptions={onChangeCommandsFilter}
          />
          <ActionsLogFilter
            filterName={'statuses'}
            isFlyout={isFlyout}
            onChangeFilterOptions={onChangeStatusesFilter}
          />
        </>
      );
    }, [
      isFlyout,
      onChangeCommandsFilter,
      onChangeHostsFilter,
      onChangeStatusesFilter,
      showHostsFilter,
    ]);

    const onClickRefreshButton = useCallback(() => onClick(), [onClick]);

    return (
      <EuiFlexGroup responsive gutterSize="s">
        <EuiFlexItem grow={isFlyout ? 1 : 2}>
          <ActionsLogUsersFilter isFlyout={isFlyout} onChangeUsersFilter={onChangeUsersFilter} />
        </EuiFlexItem>
        <EuiFlexItem grow={isFlyout ? 1 : 1}>
          <EuiFilterGroup>{filters}</EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={isFlyout ? 1 : 2}>
          <ActionLogDateRangePicker
            dateRangePickerState={dateRangePickerState}
            isDataLoading={isDataLoading}
            isFlyout={isFlyout}
            onRefresh={onRefresh}
            onRefreshChange={onRefreshChange}
            onTimeChange={onTimeChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperUpdateButton
            iconOnly
            data-test-subj={getTestId('super-refresh-button')}
            fill={false}
            isLoading={isDataLoading}
            onClick={onClickRefreshButton}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ActionsLogFilters.displayName = 'ActionsLogFilters';
