/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl, renderWithIntl } from '@kbn/test/jest';
import { PingTimestamp } from './ping_timestamp';
import { mockReduxHooks } from '../../../../lib/helper/test_helpers';
import { Ping } from '../../../../../common/runtime_types/ping';
import { EuiThemeProvider } from '../../../../../../observability/public';

mockReduxHooks();

describe('Ping Timestamp component', () => {
  let response: Ping;

  beforeAll(() => {
    response = {
      ecs: { version: '1.6.0' },
      agent: {
        ephemeral_id: '52ce1110-464f-4d74-b94c-3c051bf12589',
        id: '3ebcd3c2-f5c3-499e-8d86-80f98e5f4c08',
        name: 'docker-desktop',
        type: 'heartbeat',
        version: '7.10.0',
        hostname: 'docker-desktop',
      },
      monitor: {
        status: 'up',
        check_group: 'f58a484f-2ffb-11eb-9b35-025000000001',
        duration: { us: 1528598 },
        id: 'basic addition and completion of single task',
        name: 'basic addition and completion of single task',
        type: 'browser',
        timespan: { lt: '2020-11-26T15:29:56.820Z', gte: '2020-11-26T15:28:56.820Z' },
      },
      url: {
        full: 'file:///opt/elastic-synthetics/examples/todos/app/index.html',
        scheme: 'file',
        domain: '',
        path: '/opt/elastic-synthetics/examples/todos/app/index.html',
      },
      synthetics: { type: 'heartbeat/summary' },
      summary: { up: 1, down: 0 },
      timestamp: '2020-11-26T15:28:56.896Z',
      docId: '0WErBXYB0mvWTKLO-yQm',
    };
  });

  it('shallow render without errors', () => {
    const component = shallowWithIntl(
      <PingTimestamp ping={response} timestamp={response.timestamp} />
    );
    expect(component).toMatchSnapshot();
  });

  it('render without errors', () => {
    const component = renderWithIntl(
      <EuiThemeProvider darkMode={false}>
        <PingTimestamp ping={response} timestamp={response.timestamp} />
      </EuiThemeProvider>
    );
    expect(component).toMatchSnapshot();
  });
});
