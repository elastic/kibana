/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import PropTypes from 'prop-types';
import React, { SFC } from 'react';
import { DatetimeCalendar } from '../datetime_calendar';

export interface Props {
  /** Start date (Moment date object) */
  from?: moment.Moment;
  /** End date (Moment date object) */
  to?: moment.Moment;
  /** Function invoked when the selected date changes */
  onSelect: (from?: moment.Moment, to?: moment.Moment) => void;
}
export const DatetimeRangeAbsolute: SFC<Props> = ({ from, to, onSelect }) => (
  <div className="canvasDateTimeRangeAbsolute">
    <div>
      <DatetimeCalendar
        value={from}
        startDate={from}
        endDate={to}
        maxDate={to}
        onValueChange={val => onSelect(val, to)}
        onSelect={(val: moment.Moment | null) => {
          // sets the time to start of day if only the date was selected
          if (to && val) {
            if (from && from.format('hh:mm:ss a') === val.format('hh:mm:ss a')) {
              onSelect(val.startOf('day'), to);
            } else {
              onSelect(val, to);
            }
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
          if (from && val) {
            if (to && to.format('hh:mm:ss a') === val.format('hh:mm:ss a')) {
              onSelect(from, val.endOf('day'));
            } else {
              onSelect(from, val);
            }
          }
        }}
      />
    </div>
  </div>
);

DatetimeRangeAbsolute.propTypes = {
  from: PropTypes.instanceOf(moment).isRequired, // a moment
  to: PropTypes.instanceOf(moment).isRequired, // a moment
  onSelect: PropTypes.func.isRequired,
};
