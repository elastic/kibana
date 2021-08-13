/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiDatePicker,
  EuiDatePickerRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';

import * as i18n from './translations';

export interface RangePickerProps {
  setRange: ({ to, from }: { to: string; from: string }) => void;
  loading: boolean;
}

export const EnrichmentRangePicker: React.FC<RangePickerProps> = ({ setRange, loading }) => {
  const [startDate, setStartDate] = useState<moment.Moment | null>(moment().subtract(30, 'd'));
  const [endDate, setEndDate] = useState<moment.Moment | null>(moment());

  const onButtonClick = useCallback(() => {
    if (startDate && endDate && startDate.isBefore(endDate)) {
      setRange({
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      });
    }
  }, [endDate, setRange, startDate]);

  const isValid = useMemo(() => startDate?.isBefore(endDate), [startDate, endDate]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiDatePickerRange
          fullWidth
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
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType={'refresh'}
          onClick={onButtonClick}
          isLoading={loading}
          data-test-subj={'enrichment-button'}
          isDisabled={!isValid}
        >
          {i18n.REFRESH}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
