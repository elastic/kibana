/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { ErrorListItem } from 'x-pack/plugins/uptime/common/graphql/types';
import { ErrorList } from '../error_list';

describe('ErrorList component', () => {
  let getErrorListResponse: { errorList: ErrorListItem[] };
  beforeEach(() => {
    getErrorListResponse = {
      errorList: [
        {
          latestMessage:
            'Get http://localhost:12349/: dial tcp 127.0.0.1:12349: connect: connection refused',
          monitorId: 'auto-http-0X3675F89EF0612091',
          type: 'io',
          count: 843,
          statusCode: null,
          timestamp: '2019-01-28T18:43:15.077Z',
          latestMonitor: {
            id: 'auto-http-0X3675F89EF0612091',
            name: 'myname',
            url: { full: 'http://localhost:12349/' },
          },
        },
        {
          latestMessage: 'dial tcp 127.0.0.1:9200: connect: connection refused',
          monitorId: 'auto-tcp-0X81440A68E839814C',
          type: 'io',
          count: 748,
          statusCode: null,
          timestamp: '2019-01-28T17:59:34.075Z',
          latestMonitor: {
            id: 'auto-tcp-0X81440A68E839814C',
            name: 'TCP Elasticsearch',
            url: { full: '127.0.0.1:9200' },
          },
        },
        {
          latestMessage: 'lookup www.reddit.com: no such host',
          monitorId: 'auto-http-0XD9AE729FC1C1E04A',
          type: 'io',
          count: 1,
          statusCode: null,
          timestamp: '2019-01-28T18:03:10.077Z',
          latestMonitor: {
            id: 'auto-http-0XD9AE729FC1C1E04A',
            name: 'myname',
            url: { full: 'http://www.reddit.com' },
          },
        },
        {
          latestMessage: 'received status code 301 expecting 200',
          monitorId: 'auto-http-0XA8096548ECEB85B7',
          type: 'validate',
          count: 645,
          statusCode: '301',
          timestamp: '2019-01-28T18:43:07.078Z',
          latestMonitor: {
            id: 'auto-http-0XA8096548ECEB85B7',
            name: 'Local 9499',
            url: { full: 'http://localhost:9499/' },
          },
        },
      ],
    };
  });

  it('renders the error list without errors', () => {
    const { errorList } = getErrorListResponse;
    const component = shallowWithIntl(<ErrorList loading={false} errorList={errorList} />);
    expect(component).toMatchSnapshot();
  });
});
