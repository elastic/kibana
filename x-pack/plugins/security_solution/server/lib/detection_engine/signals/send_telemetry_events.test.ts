/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { selectEvents } from './send_telemetry_events';
import { loggingSystemMock } from 'src/core/server/mocks';

describe('sendAlertTelemetry', () => {
  it('selectEvents', () => {
    const filteredEvents = {
      hits: {
        hits: [
          {
            _source: {
              key1: 'hello',
            },
          },
          {
            key2: 'hello',
          },
          {
            _source: {
              key3: 'hello',
            },
          },
        ],
      },
    };

    const sources = selectEvents(filteredEvents);
    expect(sources).toStrictEqual([
      {
        key1: 'hello',
      },
      {
        key3: 'hello',
      },
    ]);
  });
});
