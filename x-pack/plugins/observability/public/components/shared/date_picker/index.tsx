/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React, { useCallback } from 'react';
import { UI_SETTINGS, useKibanaUISettings } from '../../../hooks/use_kibana_ui_settings';
import { TimePickerQuickRange } from './typings';
import { useDatePickerContext } from '../../../hooks/use_date_picker_context';

export interface DatePickerProps {
  rangeFrom?: string;
  rangeTo?: string;
  refreshPaused?: boolean;
  refreshInterval?: number;
  onTimeRangeRefresh?: (range: { start: string; end: string }) => void;
}

export function DatePicker({
  rangeFrom,
  rangeTo,
  refreshPaused,
  refreshInterval,
  onTimeRangeRefresh,
}: DatePickerProps) {
  const { updateTimeRange, updateRefreshInterval } = useDatePickerContext();

  const timePickerQuickRanges = useKibanaUISettings<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );

  const commonlyUsedRanges = timePickerQuickRanges.map(({ from, to, display }) => ({
    start: from,
    end: to,
    label: display,
  }));

  function onRefreshChange({
    isPaused,
    refreshInterval: interval,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) {
    updateRefreshInterval({ isPaused, interval });
  }

  const onRefresh = useCallback(
    (newRange: { start: string; end: string }) => {
      if (onTimeRangeRefresh) {
        onTimeRangeRefresh(newRange);
      }
      updateTimeRange(newRange);
    },
    [onTimeRangeRefresh, updateTimeRange]
  );

  return (
    <EuiSuperDatePicker
      start={rangeFrom}
      end={rangeTo}
      onTimeChange={onRefresh}
      onRefresh={onRefresh}
      isPaused={refreshPaused}
      refreshInterval={refreshInterval}
      onRefreshChange={onRefreshChange}
      commonlyUsedRanges={commonlyUsedRanges}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default DatePicker;
