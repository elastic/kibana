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
import type { DateRangePickerValues } from './action_list_date_range_picker';
import { ActionListDateRangePicker } from './action_list_date_range_picker';
import { ActionListFilter } from './action_list_filter';
import type { FilterName } from './hooks';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export const ActionListFilters = memo(
  ({
    dateRangePickerState,
    isDataLoading,
    onClick,
    onChangeCommandsFilter,
    onRefresh,
    onRefreshChange,
    onTimeChange,
  }: {
    dateRangePickerState: DateRangePickerValues;
    isDataLoading: boolean;
    onChangeCommandsFilter: (selectedCommands: string[]) => void;
    onRefresh: () => void;
    onRefreshChange: (evt: OnRefreshChangeProps) => void;
    onTimeChange: ({ start, end }: DurationRange) => void;
    onClick: ReturnType<typeof useGetEndpointActionList>['refetch'];
  }) => {
    const getTestId = useTestIdGenerator('response-actions-list');
    const filters = useMemo(() => {
      // TODO: add more filter names here (Users, Hosts, Statuses)
      const filterNames: FilterName[] = ['Actions'];
      return filterNames.map((filterName) => (
        <ActionListFilter
          key={filterName}
          filterName={filterName}
          onChangeCommandsFilter={onChangeCommandsFilter}
        />
      ));
    }, [onChangeCommandsFilter]);

    const onClickRefreshButton = useCallback(() => onClick(), [onClick]);

    return (
      <EuiFlexGroup responsive gutterSize="s">
        <EuiFlexItem>
          <ActionListDateRangePicker
            dateRangePickerState={dateRangePickerState}
            isDataLoading={isDataLoading}
            onRefresh={onRefresh}
            onRefreshChange={onRefreshChange}
            onTimeChange={onTimeChange}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFilterGroup>{filters}</EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperUpdateButton
            data-test-subj={getTestId('super-refresh-button')}
            fill={false}
            isLoading={isDataLoading}
            onClick={onClickRefreshButton}
            responsive={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ActionListFilters.displayName = 'ActionListFilters';
