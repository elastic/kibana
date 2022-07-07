/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';
import { buildTimeRange } from '../../../common/build_time_range';
import { commonlyUsedRanges } from '../../../common/commonly_used_ranges';
import { TimeRange } from '../../../common/types';

export function ProfilingDatePicker({
  timeRange,
  onTimeRangeChange,
}: {
  timeRange: TimeRange;
  onTimeRangeChange: (nextTimeRange: TimeRange) => void;
}) {
  return (
    <EuiSuperDatePicker
      start={timeRange.start}
      end={timeRange.end}
      isPaused={true}
      onTimeChange={(nextTime) => {
        if (nextTime.isInvalid) {
          return;
        }

        const tr = buildTimeRange(nextTime.start, nextTime.end);
        onTimeRangeChange(tr);
      }}
      commonlyUsedRanges={commonlyUsedRanges}
    />
  );
}
