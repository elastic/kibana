/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectEvents, enrichEndpointAlertsSignalID } from './send_telemetry_events';

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
              event: {
                id: 'foo',
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
              event: {
                id: 'bar',
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
              event: {
                id: 'baz',
              },
            },
          },
          {
            _index: 'y',
            _type: 'y',
            _id: 'y',
            _score: 0,
            _source: {
              '@timestamp': 'y',
              key3: 'hello',
              data_stream: {
                dataset: 'endpoint.alerts',
                other: 'y',
              },
              event: {
                id: 'not-in-map',
              },
            },
          },
          {
            _index: 'z',
            _type: 'z',
            _id: 'z',
            _score: 0,
            _source: {
              '@timestamp': 'z',
              key3: 'no-event-id',
              data_stream: {
                dataset: 'endpoint.alerts',
                other: 'z',
              },
            },
          },
        ],
      },
    };
    const joinMap = new Map<string, string>([
      ['foo', '1234'],
      ['bar', 'abcd'],
      ['baz', '4567'],
    ]);
    const subsetEvents = selectEvents(filteredEvents.hits.hits);
    const sources = enrichEndpointAlertsSignalID(subsetEvents, joinMap);
    expect(sources).toStrictEqual([
      {
        '@timestamp': 'x',
        key2: 'hello',
        data_stream: {
          dataset: 'endpoint.alerts',
          other: 'x',
        },
        event: {
          id: 'bar',
        },
        signal_id: 'abcd',
      },
      {
        '@timestamp': 'y',
        key3: 'hello',
        data_stream: {
          dataset: 'endpoint.alerts',
          other: 'y',
        },
        event: {
          id: 'not-in-map',
        },
        signal_id: undefined,
      },
      {
        '@timestamp': 'z',
        key3: 'no-event-id',
        data_stream: {
          dataset: 'endpoint.alerts',
          other: 'z',
        },
        signal_id: undefined,
      },
    ]);
  });
});
