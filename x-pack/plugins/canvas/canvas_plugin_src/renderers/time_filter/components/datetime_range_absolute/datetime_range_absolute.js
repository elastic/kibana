/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { DatetimeCalendar } from '../datetime_calendar';
import './datetime_range_absolute.scss';

export const DatetimeRangeAbsolute = ({ from, to, onSelect }) => (
  <div className="canvasDateTimeRangeAbsolute">
    <div>
      <DatetimeCalendar
        value={from}
        startDate={from}
        endDate={to}
        maxDate={to}
        onValueChange={val => onSelect(val, to)}
        onSelect={val => {
          // sets the time to start of day if only the date was selected
          if (moment(from).format('hh:mm:ss a') === val.format('hh:mm:ss a')) {
            onSelect(val.startOf('day'), to);
          } else {
            onSelect(val, to);
          }
        }}
      />
    </div>
    <div>
      <DatetimeCalendar
        value={to}
        startDate={from}
        endDate={to}
        minDate={from}
        onValueChange={val => onSelect(from, val)}
        onSelect={val => {
          // set the time to end of day if only the date was selected
          if (moment(to).format('hh:mm:ss a') === val.format('hh:mm:ss a')) {
            onSelect(from, moment(val).endOf('day'));
          } else {
            onSelect(from, val);
          }
        }}
      />
    </div>
  </div>
);

DatetimeRangeAbsolute.propTypes = {
  from: PropTypes.object, // a moment
  to: PropTypes.object, // a moment
  onSelect: PropTypes.func,
};
