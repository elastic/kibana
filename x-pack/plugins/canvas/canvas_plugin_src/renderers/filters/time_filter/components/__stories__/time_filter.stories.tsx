/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import { TimeFilter } from '../time_filter';

const timeRanges = [
  { start: 'now/d', end: 'now/d', label: 'Today' },
  { start: 'now/w', end: 'now/w', label: 'This week' },
  { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
  { start: 'now-30m', end: 'now', label: 'Last 30 minutes' },
  { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
  { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
  { start: 'now-7d', end: 'now', label: 'Last 7 days' },
  { start: 'now-30d', end: 'now', label: 'Last 30 days' },
  { start: 'now-90d', end: 'now', label: 'Last 90 days' },
  { start: 'now-1y', end: 'now', label: 'Last 1 year' },
];

storiesOf('renderers/TimeFilter', module)
  .addDecorator((story) => (
    <div
      style={{
        width: '600px',
      }}
    >
      {story()}
    </div>
  ))
  .add('default', () => (
    <TimeFilter
      filter="timefilter from=now-1y to=now column=@timestamp"
      commit={action('commit')}
    />
  ))
  .add('with relative time bounds', () => (
    <TimeFilter
      filter="timefilter from=now/w to=now/w column=@timestamp"
      commit={action('commit')}
    />
  ))
  .add('with absolute time bounds', () => (
    <TimeFilter
      filter="timefilter from='01/01/2019' to='12/31/2019' column=@timestamp"
      commit={action('commit')}
    />
  ))
  .add('with dateFormat', () => (
    <TimeFilter
      filter="timefilter from=now-24h to=now column=@timestamp"
      commit={action('commit')}
      dateFormat="MM/DD/YY HH:MM:SSA"
    />
  ))
  .add('with commonlyUsedRanges', () => (
    <TimeFilter
      filter="timefilter from=now-30d to=now column=@timestamp"
      commit={action('commit')}
      commonlyUsedRanges={timeRanges}
    />
  ));
