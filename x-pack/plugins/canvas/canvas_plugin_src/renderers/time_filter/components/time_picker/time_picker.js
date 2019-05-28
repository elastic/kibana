/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import dateMath from '@elastic/datemath';
import { EuiButton } from '@elastic/eui';
import moment from 'moment';
import { DatetimeRangeAbsolute } from '../datetime_range_absolute';
import { DatetimeQuickList } from '../datetime_quick_list';

export const quickRanges = [
  { from: 'now/d', to: 'now', display: 'Today' },
  { from: 'now-24h', to: 'now', display: 'Last 24 hours' },
  { from: 'now-7d', to: 'now', display: 'Last 7 days' },
  { from: 'now-14d', to: 'now', display: 'Last 2 weeks' },
  { from: 'now-30d', to: 'now', display: 'Last 30 days' },
  { from: 'now-90d', to: 'now', display: 'Last 90 days' },
  { from: 'now-1y', to: 'now', display: 'Last 1 year' },
];

export const TimePicker = ({ range, setRange, dirty, setDirty, onSelect }) => {
  const { from, to } = range;

  function absoluteSelect(from, to) {
    setDirty(true);
    setRange({ from: moment(from).toISOString(), to: moment(to).toISOString() });
  }

  return (
    <div className="canvasTimePicker">
      <DatetimeRangeAbsolute
        from={dateMath.parse(from)}
        to={dateMath.parse(to)}
        onSelect={absoluteSelect}
      />
      <DatetimeQuickList from={range.from} to={range.to} ranges={quickRanges} onSelect={onSelect}>
        <EuiButton
          fill
          size="s"
          disabled={!dirty}
          className="canvasTimePicker__apply"
          onClick={() => {
            setDirty(false);
            onSelect(range.from, range.to);
          }}
        >
          Apply
        </EuiButton>
      </DatetimeQuickList>
    </div>
  );
};

TimePicker.propTypes = {
  range: PropTypes.object,
  setRange: PropTypes.func,
  dirty: PropTypes.bool,
  setDirty: PropTypes.func,
  onSelect: PropTypes.func,
};
