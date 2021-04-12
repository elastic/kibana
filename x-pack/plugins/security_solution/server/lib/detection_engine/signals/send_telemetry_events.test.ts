/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectEvents } from './send_telemetry_events';

describe('sendAlertTelemetry', () => {
  it('selectEvents', () => {
    const filteredEvents = {
      took: 0,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
      },
      hits: {
        total: 2,
        max_score: 0,
        hits: [
          {
            _index: 'x',
            _type: 'x',
            _id: 'x',
            _score: 0,
            _source: {
              '@timestamp': 'x',
              key1: 'hello',
              data_stream: {
                dataset: 'endpoint.events',
              },
            },
          },
          {
            _index: 'x',
            _type: 'x',
            _id: 'x',
            _score: 0,
            _source: {
              '@timestamp': 'x',
              key2: 'hello',
              data_stream: {
                dataset: 'endpoint.alerts',
                other: 'x',
              },
            },
          },
          {
            _index: 'x',
            _type: 'x',
            _id: 'x',
            _score: 0,
            _source: {
              '@timestamp': 'x',
              key3: 'hello',
              data_stream: {},
            },
          },
        ],
      },
    };

    const sources = selectEvents(filteredEvents);
    expect(sources).toStrictEqual([
      {
        '@timestamp': 'x',
        key2: 'hello',
        data_stream: {
          dataset: 'endpoint.alerts',
          other: 'x',
        },
      },
    ]);
  });
});
