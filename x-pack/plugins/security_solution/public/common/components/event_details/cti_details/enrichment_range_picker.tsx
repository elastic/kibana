/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import { EuiDatePicker, EuiDatePickerRange } from '@elastic/eui';

import * as i18n from './translations';

interface Range {
  from: string;
  to: string;
}
export type RangeCallback = (range: Range) => void;

export const EnrichmentRangePicker: React.FC<{ onChange: RangeCallback }> = ({ onChange }) => {
  const [startDate, setStartDate] = useState<moment.Moment | null>(moment().subtract(30, 'd'));
  const [endDate, setEndDate] = useState<moment.Moment | null>(moment());

  useEffect(() => {
    if (startDate && endDate) {
      onChange({ from: startDate.toISOString(), to: endDate.toISOString() });
    }
  }, [endDate, onChange, startDate]);
  const isValid = useMemo(() => startDate?.isBefore(endDate), [endDate, startDate]);

  return (
    <EuiDatePickerRange
      data-test-subj="enrichment-query-range-picker"
      startDateControl={
        <EuiDatePicker
          className="start-picker"
          selected={startDate}
          onChange={setStartDate}
          startDate={startDate}
          endDate={endDate}
          isInvalid={!isValid}
          aria-label={i18n.ENRICHMENT_LOOKBACK_START_DATE}
          showTimeSelect
        />
      }
      endDateControl={
        <EuiDatePicker
          className="end-picker"
          selected={endDate}
          onChange={setEndDate}
          startDate={startDate}
          endDate={endDate}
          isInvalid={!isValid}
          aria-label={i18n.ENRICHMENT_LOOKBACK_END_DATE}
          showTimeSelect
        />
      }
    />
  );
};
