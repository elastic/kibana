/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiSuperDatePicker } from '@elastic/eui';
import { UI_SETTINGS } from '@kbn/data-service';
import { TimePickerQuickRange } from '@kbn/observability-shared-plugin/public/hooks/use_quick_time_ranges';
import React, { useCallback, useMemo } from 'react';
import { useDatasetQualityFilters } from '../../hooks/use_dataset_quality_filters';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function Filters() {
  const { timeRange, handleTimeChange, onRefresh } = useDatasetQualityFilters();

  const {
    services: { uiSettings },
  } = useKibanaContextForPlugin();

  const timePickerQuickRanges = uiSettings.get<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );

  const commonlyUsedRanges = useMemo(
    () =>
      timePickerQuickRanges.map(({ from, to, display }) => ({
        start: from,
        end: to,
        label: display,
      })),
    [timePickerQuickRanges]
  );

  const onTimeChange = useCallback(
    (selectedTime: { start: string; end: string; isInvalid: boolean }) => {
      if (selectedTime.isInvalid) {
        return;
      }
      handleTimeChange(selectedTime.start, selectedTime.end);
    },
    [handleTimeChange]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          start={timeRange.from}
          end={timeRange.to}
          onTimeChange={onTimeChange}
          onRefresh={onRefresh}
          onRefreshChange={/* onRefreshChange */ (e) => console.log(e)}
          commonlyUsedRanges={commonlyUsedRanges}
          showUpdateButton={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
