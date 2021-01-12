/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from '@kbn/test/jest';
import React from 'react';
import { ConsoleOutputEventList } from './console_output_event_list';

describe('ConsoleOutputEventList component', () => {
  it('renders a component per console event', () => {
    expect(
      shallowWithIntl(
        <ConsoleOutputEventList
          journey={{
            checkGroup: 'check_group',
            loading: false,
            // 4 steps, three console, one step/end
            steps: [
              {
                timestamp: '123',
                docId: '1',
                monitor: {
                  id: 'MON_ID',
                  duration: {
                    us: 10,
                  },
                  status: 'down',
                  type: 'browser',
                },
                synthetics: {
                  type: 'stderr',
                },
              },
              {
                timestamp: '124',
                docId: '2',
                monitor: {
                  id: 'MON_ID',
                  duration: {
                    us: 10,
                  },
                  status: 'down',
                  type: 'browser',
                },
                synthetics: {
                  type: 'cmd/status',
                },
              },
              {
                timestamp: '124',
                docId: '2',
                monitor: {
                  id: 'MON_ID',
                  duration: {
                    us: 10,
                  },
                  status: 'down',
                  type: 'browser',
                },
                synthetics: {
                  type: 'step/end',
                },
              },
              {
                timestamp: '125',
                docId: '3',
                monitor: {
                  id: 'MON_ID',
                  duration: {
                    us: 10,
                  },
                  status: 'down',
                  type: 'browser',
                },
                synthetics: {
                  type: 'stdout',
                },
              },
            ],
          }}
        />
      ).find('EuiCodeBlock')
    ).toMatchInlineSnapshot(`
      <EuiCodeBlock>
        <ConsoleEvent
          event={
            Object {
              "docId": "1",
              "monitor": Object {
                "duration": Object {
                  "us": 10,
                },
                "id": "MON_ID",
                "status": "down",
                "type": "browser",
              },
              "synthetics": Object {
                "type": "stderr",
              },
              "timestamp": "123",
            }
          }
          key="1_console-event-row"
        />
        <ConsoleEvent
          event={
            Object {
              "docId": "2",
              "monitor": Object {
                "duration": Object {
                  "us": 10,
                },
                "id": "MON_ID",
                "status": "down",
                "type": "browser",
              },
              "synthetics": Object {
                "type": "cmd/status",
              },
              "timestamp": "124",
            }
          }
          key="2_console-event-row"
        />
        <ConsoleEvent
          event={
            Object {
              "docId": "3",
              "monitor": Object {
                "duration": Object {
                  "us": 10,
                },
                "id": "MON_ID",
                "status": "down",
                "type": "browser",
              },
              "synthetics": Object {
                "type": "stdout",
              },
              "timestamp": "125",
            }
          }
          key="3_console-event-row"
        />
      </EuiCodeBlock>
    `);
  });
});
