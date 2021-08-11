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
import { SetDate } from '../../../containers/cti/event_enrichment';

export interface RangePickerProps {
  setStartDate: SetDate;
  setEndDate: SetDate;
  startDate: moment.Moment;
  endDate: moment.Moment;
  loading: boolean;
}

export const EnrichmentRangePicker: React.FC<RangePickerProps> = ({
  setStartDate,
  setEndDate,
  startDate,
  endDate,
  loading,
}) => {
  const [localStartDate, setLocalStartDate] = useState<moment.Moment | null>(startDate);
  const [localEndDate, setLocalEndDate] = useState<moment.Moment | null>(endDate);

  const onButtonClick = useCallback(() => {
    if (localStartDate && startDate !== localStartDate) {
      setStartDate(localStartDate);
    }
    if (localEndDate && endDate !== localEndDate) {
      setEndDate(localEndDate);
    }
  }, [endDate, setStartDate, localStartDate, localEndDate, setEndDate, startDate]);

  const isValid = useMemo(() => localStartDate?.isBefore(localEndDate), [
    localStartDate,
    localEndDate,
  ]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiDatePickerRange
          fullWidth
          data-test-subj="enrichment-query-range-picker"
          startDateControl={
            <EuiDatePicker
              className="start-picker"
              selected={localStartDate}
              onChange={setLocalStartDate}
              startDate={localStartDate}
              endDate={localEndDate}
              isInvalid={!isValid}
              aria-label={i18n.ENRICHMENT_LOOKBACK_START_DATE}
              showTimeSelect
            />
          }
          endDateControl={
            <EuiDatePicker
              className="end-picker"
              selected={localEndDate}
              onChange={setLocalEndDate}
              startDate={localStartDate}
              endDate={localEndDate}
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
        >
          {i18n.REFRESH}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
