/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import { RESPONSE_ACTION_COMMANDS } from '../../../../../common/endpoint/types';
import type { useGetEndpointActionList } from '../../../hooks';
import type { DateRangePickerValues } from './action_list_date_range_picker';
import { ActionListDateRangePicker } from './action_list_date_range_picker';
import { ActionListFilterGroup } from './action_list_filter_group';

export const ActionListFilters = memo(
  ({
    dateRangePickerState,
    isDataLoading,
    onClick,
    onChangeCommand,
    onRefresh,
    onRefreshChange,
    onTimeChange,
  }: {
    dateRangePickerState: DateRangePickerValues;
    isDataLoading: boolean;
    onChangeCommand: (selectedCommands: Array<typeof RESPONSE_ACTION_COMMANDS[number]>) => void;
    onRefresh: () => void;
    onRefreshChange: (evt: OnRefreshChangeProps) => void;
    onTimeChange: ({ start, end }: DurationRange) => void;
    onClick: ReturnType<typeof useGetEndpointActionList>['refetch'];
  }) => {
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
          <ActionListFilterGroup
            onChangeCommand={onChangeCommand}
            filters={[{ filterName: 'Command', filterItems: RESPONSE_ACTION_COMMANDS.slice() }]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ActionListFilters.displayName = 'ActionListFilters';
