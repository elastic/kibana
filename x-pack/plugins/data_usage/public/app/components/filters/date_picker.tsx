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
import { parseToMoment, DEFAULT_DATE_RANGE_OPTIONS } from '../../../../common/utils';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

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
  'data-test-subj'?: string;
}

export const UsageMetricsDateRangePicker = memo<UsageMetricsDateRangePickerProps>(
  ({
    dateRangePickerState,
    isDataLoading,
    onRefresh,
    onRefreshChange,
    onTimeChange,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const kibana = useKibana<IUnifiedSearchPluginServices>();
    const { uiSettings } = kibana.services;
    const [commonlyUsedRanges] = useState(() => {
      const _commonlyUsedRanges: Array<{ from: string; to: string; display: string }> =
        uiSettings.get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES);
      if (!_commonlyUsedRanges) {
        return [];
      }
      return _commonlyUsedRanges.reduce<DurationRange[]>(
        (acc, { from, to, display }: { from: string; to: string; display: string }) => {
          if (!['now-30d/d', 'now-90d/d', 'now-1y/d'].includes(from)) {
            acc.push({
              start: from,
              end: to,
              label: display,
            });
          }
          return acc;
        },
        []
      );
    });

    return (
      <EuiSuperDatePicker
        data-test-subj={getTestId('date-range')}
        isLoading={isDataLoading}
        dateFormat={'MMM D, YYYY @ HH:mm'}
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
        timeFormat={'HH:mm'}
        updateButtonProps={{ iconOnly: false, fill: false }}
        utcOffset={0}
        maxDate={parseToMoment(DEFAULT_DATE_RANGE_OPTIONS.maxDate)}
        minDate={parseToMoment(DEFAULT_DATE_RANGE_OPTIONS.minDate)}
        width="auto"
      />
    );
  }
);

UsageMetricsDateRangePicker.displayName = 'UsageMetricsDateRangePicker';
