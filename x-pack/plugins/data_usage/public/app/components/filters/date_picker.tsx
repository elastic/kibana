/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import type { IUnifiedSearchPluginServices } from '@kbn/unified-search-plugin/public';
import type { EuiSuperDatePickerRecentRange } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import { UI_SETTINGS } from '@kbn/data-plugin/common';

export interface DateRangePickerValues {
  autoRefreshOptions: {
    enabled: boolean;
    duration: number;
  };
  startDate: string;
  endDate: string;
  recentlyUsedDateRanges: EuiSuperDatePickerRecentRange[];
}

interface UsageMetricsDateRangePickerProps {
  dateRangePickerState: DateRangePickerValues;
  isDataLoading: boolean;
  onRefresh: () => void;
  onRefreshChange: (evt: OnRefreshChangeProps) => void;
  onTimeChange: ({ start, end }: DurationRange) => void;
}

export const UsageMetricsDateRangePicker = memo<UsageMetricsDateRangePickerProps>(
  ({ dateRangePickerState, isDataLoading, onRefresh, onRefreshChange, onTimeChange }) => {
    const kibana = useKibana<IUnifiedSearchPluginServices>();
    const { uiSettings } = kibana.services;
    const [commonlyUsedRanges] = useState(() => {
      return (
        uiSettings
          ?.get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES)
          ?.map(({ from, to, display }: { from: string; to: string; display: string }) => {
            return {
              start: from,
              end: to,
              label: display,
            };
          }) ?? []
      );
    });

    return (
      <EuiSuperDatePicker
        isLoading={isDataLoading}
        dateFormat={uiSettings.get('dateFormat')}
        commonlyUsedRanges={commonlyUsedRanges}
        end={dateRangePickerState.endDate}
        isPaused={!dateRangePickerState.autoRefreshOptions.enabled}
        onTimeChange={onTimeChange}
        onRefreshChange={onRefreshChange}
        refreshInterval={dateRangePickerState.autoRefreshOptions.duration}
        onRefresh={onRefresh}
        recentlyUsedRanges={dateRangePickerState.recentlyUsedDateRanges}
        start={dateRangePickerState.startDate}
        showUpdateButton={false}
        updateButtonProps={{ iconOnly: false, fill: false }}
        width="auto"
      />
    );
  }
);

UsageMetricsDateRangePicker.displayName = 'UsageMetricsDateRangePicker';
