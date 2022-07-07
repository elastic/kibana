/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';
import { commonlyUsedRanges } from '../../../common/commonly_used_ranges';

export function ProfilingDatePicker({
  rangeFrom,
  rangeTo,
  onTimeRangeChange,
}: {
  rangeFrom: string;
  rangeTo: string;
  onTimeRangeChange: (nextTimeRange: { rangeFrom: string; rangeTo: string }) => void;
}) {
  return (
    <EuiSuperDatePicker
      start={rangeFrom}
      end={rangeTo}
      isPaused={true}
      onTimeChange={(nextTime) => {
        if (nextTime.isInvalid) {
          return;
        }

        onTimeRangeChange({ rangeFrom: nextTime.start, rangeTo: nextTime.end });
      }}
      commonlyUsedRanges={commonlyUsedRanges}
    />
  );
}
