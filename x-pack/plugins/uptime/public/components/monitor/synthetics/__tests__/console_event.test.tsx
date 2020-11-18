/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from '@kbn/test/jest';
import React from 'react';
import { ConsoleEvent } from '../console_event';

describe('ConsoleEvent component', () => {
  it('renders danger color for errors', () => {
    expect(
      shallowWithIntl(
        <ConsoleEvent
          event={{
            timestamp: '123',
            docId: '1',
            monitor: {
              id: 'MONITOR_ID',
              duration: {
                us: 123,
              },
              type: 'browser',
              status: 'down',
            },
            synthetics: {
              payload: {
                message: 'catastrophic error',
              },
              type: 'stderr',
            },
          }}
        />
      )
    ).toMatchInlineSnapshot(`
      <EuiFlexGroup>
        <EuiFlexItem
          grow={false}
        >
          123
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          style={
            Object {
              "color": "#bd271e",
            }
          }
        >
          stderr
        </EuiFlexItem>
        <EuiFlexItem>
          catastrophic error
        </EuiFlexItem>
      </EuiFlexGroup>
    `);
  });

  it('uses default color for non-errors', () => {
    expect(
      shallowWithIntl(
        <ConsoleEvent
          event={{
            timestamp: '123',
            docId: '1',
            monitor: {
              id: 'MONITOR_ID',
              duration: {
                us: 123,
              },
              type: 'browser',
              status: 'down',
            },
            synthetics: {
              payload: {
                message: 'not a catastrophic error',
              },
              type: 'cmd/status',
            },
          }}
        />
      )
    ).toMatchInlineSnapshot(`
      <EuiFlexGroup>
        <EuiFlexItem
          grow={false}
        >
          123
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          style={
            Object {
              "color": undefined,
            }
          }
        >
          cmd/status
        </EuiFlexItem>
        <EuiFlexItem>
          not a catastrophic error
        </EuiFlexItem>
      </EuiFlexGroup>
    `);
  });
});
