/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import dateMath from '@elastic/datemath';
import { EuiDatePicker } from '@elastic/eui';
import { DatetimeInput } from '../datetime_input';
import './datetime_calendar.scss';

export const DatetimeCalendar = ({
  value,
  onValueChange,
  onSelect,
  startDate,
  endDate,
  minDate,
  maxDate,
}) => (
  <div className="canvasDateTimeCal">
    <DatetimeInput moment={dateMath.parse(value)} setMoment={onValueChange} />
    <EuiDatePicker
      inline
      showTimeSelect
      shadow={false}
      selected={dateMath.parse(value)}
      onChange={onSelect}
      shouldCloseOnSelect={false}
      startDate={startDate}
      endDate={endDate}
      minDate={minDate}
      maxDate={maxDate}
    />
  </div>
);

DatetimeCalendar.propTypes = {
  value: PropTypes.object,
  onSelect: PropTypes.func,
  onValueChange: PropTypes.func, // Called with a moment
  startDate: PropTypes.object, // a moment
  endDate: PropTypes.object, // a moment
  minDate: PropTypes.object, // a moment
  maxDate: PropTypes.object, // a moment
};
