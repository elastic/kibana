/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { InlineError } from './inline_error';

describe('<InlineError />', () => {
  it('calls delete monitor on monitor deletion', () => {
    render(<InlineError errorSummary={errorSummary} />);

    expect(
      screen.getByLabelText(
        'journey did not finish executing, 0 steps ran. Click for more details.'
      )
    ).toBeInTheDocument();
  });
});

const errorSummary = {
  docId: 'testDoc',
  summary: { up: 0, down: 1 },
  agent: {
    name: 'cron-686f0ce427dfd7e3-27465864-sqs5l',
    id: '778fe9c6-bbd1-47d4-a0be-73f8ba9cec61',
    type: 'heartbeat',
    ephemeral_id: 'bc1a961f-1fbc-4253-aee0-633a8f6fc56e',
    version: '8.1.0',
  },
  synthetics: { type: 'heartbeat/summary' },
  monitor: {
    name: 'Browser monitor',
    check_group: 'f5480358-a9da-11ec-bced-6274e5883bd7',
    id: '3a5553a0-a949-11ec-b7ca-c3b39fffa2af',
    timespan: { lt: '2022-03-22T12:27:02.563Z', gte: '2022-03-22T12:24:02.563Z' },
    type: 'browser',
    status: 'down',
  },
  error: { type: 'io', message: 'journey did not finish executing, 0 steps ran' },
  url: {},
  observer: {
    geo: {
      continent_name: 'North America',
      city_name: 'Iowa',
      country_iso_code: 'US',
      name: 'North America - US Central',
      location: '41.8780, 93.0977',
    },
    hostname: 'cron-686f0ce427dfd7e3-27465864-sqs5l',
    ip: ['10.1.9.110'],
    mac: ['62:74:e5:88:3b:d7'],
  },
  ecs: { version: '8.0.0' },
  config_id: '3a5553a0-a949-11ec-b7ca-c3b39fffa2af',
  data_stream: { namespace: 'default', type: 'synthetics', dataset: 'browser' },
  timestamp: '2022-03-22T12:24:02.563Z',
};
