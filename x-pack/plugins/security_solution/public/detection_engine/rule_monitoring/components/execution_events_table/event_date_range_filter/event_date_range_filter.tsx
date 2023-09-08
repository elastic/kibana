/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiDatePicker, EuiDatePickerRange } from '@elastic/eui';
import type { Moment } from 'moment';
import type { DateRange } from '../../../api';

interface EventDateRangeFilterProps {
  value?: DateRange;
  onChange: (value?: DateRange) => void;
}

export function EventDateRangeFilter({ value, onChange }: EventDateRangeFilterProps): JSX.Element {
  const handleStartDateChange = useCallback(
    (date?: Moment | null) => date && onChange({ start: date, end: value?.end }),
    [onChange, value]
  );
  const handleEndDateChange = useCallback(
    (date?: Moment | null) => date && onChange({ start: value?.start, end: date }),
    [onChange, value]
  );
  const handleClear = useCallback(() => onChange(), [onChange]);

  return (
    <EuiDatePickerRange
      startDateControl={
        <EuiDatePicker
          showTimeSelect
          selected={value?.start}
          onChange={handleStartDateChange}
          aria-label="Start event log date"
        />
      }
      endDateControl={
        <EuiDatePicker
          showTimeSelect
          selected={value?.end}
          onChange={handleEndDateChange}
          onClear={() => handleEndDateChange()}
          aria-label="End event log date"
        />
      }
      append={<EuiButtonIcon iconType="cross" onClick={handleClear} />}
    />
  );
}
