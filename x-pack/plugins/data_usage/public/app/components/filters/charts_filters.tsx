/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiFilterGroup, EuiFlexGroup, EuiFlexItem, EuiSuperUpdateButton } from '@elastic/eui';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useGetDataUsageMetrics } from '../../../hooks/use_get_usage_metrics';
import { DateRangePickerValues, UsageMetricsDateRangePicker } from './date_picker';
import { ChartsFilter } from './charts_filter';

interface ChartFiltersProps {
  dateRangePickerState: DateRangePickerValues;
  isDataLoading: boolean;
  onChangeDataStreamsFilter: (selectedDataStreams: string[]) => void;
  onChangeMetricTypesFilter?: (selectedMetricTypes: string[]) => void;
  onRefresh: () => void;
  onRefreshChange: (evt: OnRefreshChangeProps) => void;
  onTimeChange: ({ start, end }: DurationRange) => void;
  onClick: ReturnType<typeof useGetDataUsageMetrics>['refetch'];
  showMetricsTypesFilter?: boolean;
  'data-test-subj'?: string;
}

export const ChartFilters = memo<ChartFiltersProps>(
  ({
    dateRangePickerState,
    isDataLoading,
    onClick,
    onChangeMetricTypesFilter,
    onChangeDataStreamsFilter,
    onRefresh,
    onRefreshChange,
    onTimeChange,
    showMetricsTypesFilter = false,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const filters = useMemo(() => {
      return (
        <>
          {showMetricsTypesFilter && (
            <ChartsFilter
              filterName={'metricTypes'}
              onChangeFilterOptions={onChangeMetricTypesFilter}
            />
          )}
          <ChartsFilter
            filterName={'dataStreams'}
            onChangeFilterOptions={onChangeDataStreamsFilter}
          />
        </>
      );
    }, [onChangeDataStreamsFilter, onChangeMetricTypesFilter, showMetricsTypesFilter]);

    const onClickRefreshButton = useCallback(() => onClick(), [onClick]);

    return (
      <EuiFlexGroup responsive gutterSize="m">
        <EuiFlexItem grow={1}>
          <EuiFilterGroup>{filters}</EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <UsageMetricsDateRangePicker
            dateRangePickerState={dateRangePickerState}
            isDataLoading={isDataLoading}
            onRefresh={onRefresh}
            onRefreshChange={onRefreshChange}
            onTimeChange={onTimeChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperUpdateButton
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

ChartFilters.displayName = 'ChartFilters';
