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
          latestMessage: 'received status code 301 expecting 200',
          monitorId: 'http@http://www.example.com',
          type: 'validate',
          count: 482,
          statusCode: '301',
          timestamp: '2019-01-18T23:02:58.384Z',
        },
        {
          latestMessage:
            'Get http://localhost:12349/: dial tcp 127.0.0.1:12349: connect: connection refused',
          monitorId: 'http@http://localhost:12349/',
          type: 'io',
          count: 6,
          statusCode: null,
          timestamp: '2019-01-18T22:11:18.387Z',
        },
        {
          latestMessage:
            'Get https://example.com/: http: request timed out while waiting for response (Client.Timeout exceeded while awaiting headers)',
          monitorId: 'http@http://www.example.com',
          type: 'io',
          count: 1,
          statusCode: null,
          timestamp: '2019-01-18T22:42:23.391Z',
        },
        {
          latestMessage:
            'Get http://www.google.com/: dial tcp 172.217.11.36:80: connect: network is down',
          monitorId: 'http@http://www.google.com/',
          type: 'io',
          count: 1,
          statusCode: null,
          timestamp: '2019-01-18T23:02:27.007Z',
        },
        {
          latestMessage:
            'Get https://www.google.com/: dial tcp 172.217.11.36:443: connect: network is down',
          monitorId: 'http@https://www.google.com/',
          type: 'io',
          count: 1,
          statusCode: null,
          timestamp: '2019-01-18T23:02:27.007Z',
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
