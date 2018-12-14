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
        onValueChange={val => onSelect(val, to)}
        onSelect={val => onSelect(moment(val).startOf('day'), to)}
      />
    </div>
    <div>
      <DatetimeCalendar
        value={to}
        startDate={from}
        endDate={to}
        onValueChange={val => onSelect(from, val)}
        onSelect={val => onSelect(from, moment(val).endOf('day'))}
      />
    </div>
  </div>
);

DatetimeRangeAbsolute.propTypes = {
  from: PropTypes.object, // a moment
  to: PropTypes.object, // a moment
  onSelect: PropTypes.func,
};
