/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDatePicker, EuiDatePickerRange } from '@elastic/eui';
import { first, last, noop } from 'lodash/fp';
import moment, { Moment } from 'moment';
import * as React from 'react';
import { pure } from 'recompose';
import { getDateRange } from '../timeline/body/mini_map/date_ranges';

// TODO: replace this stub
const getDefaultStartDate = () => {
  const dates: Date[] = getDateRange('day');
  return moment(first(dates));
};

// TODO: replace this stub
const getDefaultEndDate = () => {
  const dates: Date[] = getDateRange('day');
  return moment(last(dates));
};

interface DatePickerProps {
  startDate?: Moment;
  endDate?: Moment;
}

export const DatePicker = pure<DatePickerProps>(
  ({ startDate = getDefaultStartDate(), endDate = getDefaultEndDate() }) => (
    <React.Fragment>
      <EuiDatePickerRange
        startDateControl={
          <EuiDatePicker
            selected={startDate}
            onChange={noop}
            isInvalid={false}
            aria-label="Start date"
            showTimeSelect
          />
        }
        endDateControl={
          <EuiDatePicker
            selected={endDate}
            onChange={noop}
            isInvalid={false}
            aria-label="End date"
            showTimeSelect
          />
        }
      />
    </React.Fragment>
  )
);
