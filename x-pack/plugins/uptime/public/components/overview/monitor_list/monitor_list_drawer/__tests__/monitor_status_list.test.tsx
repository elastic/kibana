/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import moment from 'moment';
import { MonitorStatusList } from '../monitor_status_list';
import { Ping } from '../../../../../../common/runtime_types';

describe('MonitorStatusList component', () => {
  let pings: Ping[];

  beforeAll(() => {
    moment.prototype.toLocaleString = jest.fn(() => '2019-06-21 15:29:26');
    moment.prototype.from = jest.fn(() => 'a few moments ago');
  });

  beforeEach(() => {
    pings = [
      {
        docId: '1',
        monitor: {
          ip: '151.101.130.217',
          name: 'elastic',
          status: 'up',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
        },
        observer: {
          geo: {},
        },
        timestamp: '1570538236414',
      },
      {
        docId: '2',
        monitor: {
          ip: '151.101.194.217',
          name: 'elastic',
          status: 'up',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
        },
        observer: {
          geo: {},
        },
        timestamp: '1570538236414',
      },
      {
        docId: '3',
        monitor: {
          ip: '151.101.2.217',
          name: 'elastic',
          status: 'up',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
        },
        observer: {
          geo: {},
        },
        timestamp: '1570538236414',
      },
      {
        docId: '4',
        monitor: {
          ip: '151.101.66.217',
          name: 'elastic',
          status: 'up',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
        },
        observer: {
          geo: {},
        },
        timestamp: '1570538236414',
      },
      {
        docId: '4',
        monitor: {
          ip: '2a04:4e42:200::729',
          name: 'elastic',
          status: 'down',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
        },
        observer: {
          geo: {},
        },
        timestamp: '1570538236414',
      },
      {
        docId: '5',
        monitor: {
          ip: '2a04:4e42:400::729',
          name: 'elastic',
          status: 'down',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
        },
        observer: {
          geo: {},
        },
        timestamp: '1570538236414',
      },
      {
        docId: '6',
        monitor: {
          ip: '2a04:4e42:600::729',
          name: 'elastic',
          status: 'down',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
        },
        observer: {
          geo: {},
        },
        timestamp: '1570538236414',
      },
      {
        docId: '5',
        monitor: {
          ip: '2a04:4e42::729',
          name: 'elastic',
          status: 'down',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
        },
        observer: {
          geo: {},
        },
        timestamp: '1570538236414',
      },
    ];
  });

  it('renders checks', () => {
    const component = shallowWithIntl(<MonitorStatusList summaryPings={pings} />);
    expect(component).toMatchSnapshot();
  });

  it('renders null in place of child status with missing ip', () => {
    const component = shallowWithIntl(<MonitorStatusList summaryPings={pings} />);
    expect(component).toMatchSnapshot();
  });
});
