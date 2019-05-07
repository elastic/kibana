/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiDatePicker } from '@elastic/eui';
import moment from 'moment';
import PropTypes from 'prop-types';
import React, { SFC } from 'react';
import { DatetimeInput } from '../datetime_input';

export interface Props {
  /** Selected date (Moment date object) */
  value?: moment.Moment;
  /** Function invoked when a date is selected from the datepicker */
  onSelect: (date: moment.Moment | null) => void;
  /** Function invoked when the date text input changes */
  onValueChange: (moment: moment.Moment) => void; // Called with a moment
  /** Start date of selected date range (Moment date object) */
  startDate?: moment.Moment;
  /** End date of selected date range (Moment date object) */
  endDate?: moment.Moment;
  /** Earliest selectable date (Moment date object) */
  minDate?: moment.Moment;
  /** Latest selectable date (Moment date object) */
  maxDate?: moment.Moment;
}

const checkDate = (value: moment.Moment | undefined) => {
  if (moment.isMoment(value)) {
    return value;
  }
  return;
};

export const DatetimeCalendar: SFC<Props> = ({
  value,
  onValueChange,
  onSelect,
  startDate,
  endDate,
  minDate,
  maxDate,
}) => (
  <div className="canvasDateTimeCal">
    <DatetimeInput moment={value} setMoment={onValueChange} />
    <EuiDatePicker
      inline
      showTimeSelect
      shadow={false}
      selected={checkDate(value)}
      onChange={onSelect}
      shouldCloseOnSelect={false}
      startDate={checkDate(startDate)}
      endDate={checkDate(endDate)}
      minDate={checkDate(minDate)}
      maxDate={checkDate(maxDate)}
    />
  </div>
);

DatetimeCalendar.propTypes = {
  value: PropTypes.instanceOf(moment),
  onSelect: PropTypes.func.isRequired,
  onValueChange: PropTypes.func.isRequired, // Called with a moment date
  startDate: PropTypes.instanceOf(moment),
  endDate: PropTypes.instanceOf(moment),
  minDate: PropTypes.instanceOf(moment),
  maxDate: PropTypes.instanceOf(moment),
};
