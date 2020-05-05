/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { Ping } from '../../../../../common/runtime_types';
import { MonitorRedirects } from '../monitor_status_bar/monitor_redirects';

describe('MonitorRedirects component', () => {
  let monitorStatus: Ping;

  beforeEach(() => {
    monitorStatus = {
      observer: {
        geo: { name: 'US-West', location: '37.422994, -122.083666' },
        hostname: 'ElasticacLoaner',
      },
      '@timestamp': '2020-05-05T16:14:56.469Z',
      http: {
        rtt: { total: { us: 157784 } },
        response: {
          status_code: 200,
          redirects: ['http://localhost:3000/first', 'https://www.washingtonpost.com/'],
          body: {
            bytes: 642102,
            hash: '597a8cfb33ff8e09bff16283306553c3895282aaf5386e1843d466d44979e28a',
          },
        },
      },
      monitor: {
        duration: { us: 157807 },
        name: 'Node-Server',
        id: 'node-server',
        check_group: '6bd9f8ce-8eeb-11ea-b33f-acde48001122',
        timespan: { lt: '2020-05-05T16:15:56.469Z', gte: '2020-05-05T16:14:56.469Z' },
        type: 'http',
        status: 'up',
      },
      url: { scheme: 'http', port: 3000, domain: 'localhost', full: 'http://localhost:3000' },
      docId: 'v0We5XEBoeLtfKIcbuQb',
      timestamp: '2020-05-05T16:14:56.469Z',
      tls: {},
    };
  });

  it('shallow renders duration in ms, not us', () => {
    const component = shallowWithIntl(<MonitorRedirects monitorStatus={monitorStatus} />);
    expect(component).toMatchSnapshot();
  });

  it('renders duration in ms, not us', () => {
    const component = renderWithIntl(<MonitorRedirects monitorStatus={monitorStatus} />);
    expect(component).toMatchSnapshot();
  });
});
