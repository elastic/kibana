/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { PingResults } from '../../../../common/graphql/types';
import { PingList } from '../ping_list';

describe('PingList component', () => {
  let pingList: { allPings: PingResults };

  beforeEach(() => {
    pingList = {
      allPings: {
        total: 798,
        pings: [
          {
            timestamp: '2019-01-18T22:02:31.383Z',
            http: { response: { status_code: 200 } },
            error: null,
            monitor: {
              duration: { us: 925862 },
              id: 'http@https://www.elastic.co',
              ip: '151.101.202.217',
              name: 'http',
              scheme: 'https',
              status: 'up',
              type: 'http',
            },
          },
          {
            timestamp: '2019-01-18T22:02:34.383Z',
            http: { response: { status_code: 200 } },
            error: null,
            monitor: {
              duration: { us: 738176 },
              id: 'http@https://www.elastic.co',
              ip: '151.101.202.217',
              name: 'http',
              scheme: 'https',
              status: 'up',
              type: 'http',
            },
          },
          {
            timestamp: '2019-01-18T22:02:37.383Z',
            http: { response: { status_code: 200 } },
            error: null,
            monitor: {
              duration: { us: 684949 },
              id: 'http@https://www.elastic.co',
              ip: '151.101.202.217',
              name: 'http',
              scheme: 'https',
              status: 'up',
              type: 'http',
            },
          },
          {
            timestamp: '2019-01-18T22:02:40.384Z',
            http: { response: { status_code: 200 } },
            error: null,
            monitor: {
              duration: { us: 773959 },
              id: 'http@https://www.elastic.co',
              ip: '151.101.202.217',
              name: 'http',
              scheme: 'https',
              status: 'up',
              type: 'http',
            },
          },
          {
            timestamp: '2019-01-18T22:02:43.385Z',
            http: { response: { status_code: 200 } },
            error: null,
            monitor: {
              duration: { us: 483803 },
              id: 'http@https://www.elastic.co',
              ip: '151.101.202.217',
              name: 'http',
              scheme: 'https',
              status: 'up',
              type: 'http',
            },
          },
        ],
      },
    };
  });

  it('renders sorted list without errors', () => {
    const { allPings } = pingList;
    const component = shallowWithIntl(
      <PingList
        loading={false}
        maxSearchSize={200}
        pingResults={allPings}
        searchSizeOnBlur={jest.fn()}
        selectedOption={{ label: 'All', value: '' }}
        selectedOptionChanged={jest.fn()}
        statusOptions={[{ label: 'All', value: '' }]}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders unsorted list of many monitors without errors', () => {
    pingList = {
      allPings: {
        total: 5834,
        pings: [
          {
            timestamp: '2019-01-18T22:03:03.383Z',
            http: { response: { status_code: 301 } },
            error: { message: 'received status code 301 expecting 200', type: 'validate' },
            monitor: {
              duration: { us: 1350724 },
              id: 'http@http://www.example.com',
              ip: '198.71.248.67',
              name: 'http',
              scheme: 'http',
              status: 'down',
              type: 'http',
            },
          },
          {
            timestamp: '2019-01-18T22:03:04.383Z',
            http: { response: { status_code: 200 } },
            error: null,
            monitor: {
              duration: { us: 567900 },
              id: 'http@https://www.elastic.co',
              ip: '151.101.210.217',
              name: 'http',
              scheme: 'https',
              status: 'up',
              type: 'http',
            },
          },
          {
            timestamp: '2019-01-18T22:03:05.384Z',
            http: null,
            error: null,
            monitor: {
              duration: { us: 1022 },
              id: 'tcp-tcp@localhost:9200',
              ip: '127.0.0.1',
              name: 'tcp',
              scheme: 'tcp',
              status: 'up',
              type: 'tcp',
            },
          },
          {
            timestamp: '2019-01-18T22:03:06.384Z',
            http: null,
            error: null,
            monitor: {
              duration: { us: 1351 },
              id: 'tcp-tcp@localhost:9200',
              ip: '127.0.0.1',
              name: 'tcp',
              scheme: 'tcp',
              status: 'up',
              type: 'tcp',
            },
          },
          {
            timestamp: '2019-01-18T22:03:07.383Z',
            http: null,
            error: null,
            monitor: {
              duration: { us: 1123 },
              id: 'tcp-tcp@localhost:9200',
              ip: '127.0.0.1',
              name: 'tcp',
              scheme: 'tcp',
              status: 'up',
              type: 'tcp',
            },
          },
          {
            timestamp: '2019-01-18T22:03:07.383Z',
            http: { response: { status_code: 200 } },
            error: null,
            monitor: {
              duration: { us: 872441 },
              id: 'http@https://www.elastic.co',
              ip: '151.101.210.217',
              name: 'http',
              scheme: 'https',
              status: 'up',
              type: 'http',
            },
          },
          {
            timestamp: '2019-01-18T22:03:08.383Z',
            http: null,
            error: null,
            monitor: {
              duration: { us: 2775 },
              id: 'tcp-tcp@localhost:9200',
              ip: '127.0.0.1',
              name: 'tcp',
              scheme: 'tcp',
              status: 'up',
              type: 'tcp',
            },
          },
          {
            timestamp: '2019-01-18T22:03:08.383Z',
            http: { response: { status_code: 200 } },
            error: null,
            monitor: {
              duration: { us: 3590 },
              id: 'http@http://localhost:12349/',
              ip: '127.0.0.1',
              name: 'http',
              scheme: 'http',
              status: 'up',
              type: 'http',
            },
          },
          {
            timestamp: '2019-01-18T22:03:08.383Z',
            http: { response: { status_code: 200 } },
            error: null,
            monitor: {
              duration: { us: 94613 },
              id: 'http@http://www.google.com/',
              ip: '172.217.11.36',
              name: 'http',
              scheme: 'http',
              status: 'up',
              type: 'http',
            },
          },
          {
            timestamp: '2019-01-18T22:03:08.383Z',
            http: { response: { status_code: 200 } },
            error: null,
            monitor: {
              duration: { us: 120698 },
              id: 'http@https://www.google.com/',
              ip: '172.217.11.36',
              name: 'http',
              scheme: 'https',
              status: 'up',
              type: 'http',
            },
          },
        ],
      },
    };
    const { allPings } = pingList;
    const component = shallowWithIntl(
      <PingList
        loading={false}
        maxSearchSize={100}
        pingResults={allPings}
        searchSizeOnBlur={jest.fn()}
        selectedOption={{ label: 'All', value: '' }}
        selectedOptionChanged={jest.fn()}
        statusOptions={[{ label: 'All', value: '' }]}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
