/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFilterGroup } from '@elastic/eui';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import type { useGetEndpointActionList } from '../../../hooks';
import type { DateRangePickerValues } from './action_list_date_range_picker';
import { ActionListDateRangePicker } from './action_list_date_range_picker';
import { ActionListFilter } from './action_list_filter';

export const ActionListFilters = memo(
  ({
    dateRangePickerState,
    isDataLoading,
    onClick,
    onChangeCommands,
    onChangeUserIds,
    onRefresh,
    onRefreshChange,
    onTimeChange,
  }: {
    dateRangePickerState: DateRangePickerValues;
    isDataLoading: boolean;
    onChangeCommands: (selectedCommands: string[]) => void;
    onChangeUserIds: (selectedUserIds: string[]) => void;
    onRefresh: () => void;
    onRefreshChange: (evt: OnRefreshChangeProps) => void;
    onTimeChange: ({ start, end }: DurationRange) => void;
    onClick: ReturnType<typeof useGetEndpointActionList>['refetch'];
  }) => {
    const filterNames = ['commands', 'users'];
    return (
      <EuiFlexGroup responsive gutterSize="s">
        <EuiFlexItem>
          <ActionListDateRangePicker
            dateRangePickerState={dateRangePickerState}
            isDataLoading={isDataLoading}
            onClick={onClick}
            onRefresh={onRefresh}
            onRefreshChange={onRefreshChange}
            onTimeChange={onTimeChange}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFilterGroup>
            {filterNames.map((filterName) => (
              <ActionListFilter
                key={filterName}
                filterName={filterName}
                onChangeCommands={onChangeCommands}
                onChangeUserIds={onChangeUserIds}
              />
            ))}
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ActionListFilters.displayName = 'ActionListFilters';
