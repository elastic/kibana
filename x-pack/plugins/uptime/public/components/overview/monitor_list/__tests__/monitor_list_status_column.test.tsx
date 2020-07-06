/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { renderWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { getLocationStatus, MonitorListStatusColumn } from '../monitor_list_status_column';
import { Check } from '../../../../../common/runtime_types';
import { STATUS } from '../../../../../common/constants';

describe('MonitorListStatusColumn', () => {
  beforeAll(() => {
    moment.prototype.toLocaleString = jest.fn(() => 'Thu May 09 2019 10:15:11 GMT-0400');
    moment.prototype.fromNow = jest.fn(() => 'a few seconds ago');
    // Only for testing purposes we allow extending Date here
    // eslint-disable-next-line no-extend-native
    Date.prototype.toString = jest.fn(() => 'Tue, 01 Jan 2019 00:00:00 GMT');
  });

  let upChecks: Check[];

  let downChecks: Check[];

  let checks: Check[];

  beforeEach(() => {
    upChecks = [
      {
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'up',
        },
        observer: {
          geo: {
            name: 'Berlin',
            location: {
              lat: 40.73060997761786,
              lon: -73.93524203449488,
            },
          },
        },
        timestamp: 1579794631464,
      },
      {
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'up',
        },
        observer: {
          geo: {
            name: 'Islamabad',
            location: {
              lat: 40.73060997761786,
              lon: -73.93524203449488,
            },
          },
        },
        timestamp: 1579794634220,
      },
      {
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'up',
        },
        observer: {
          geo: {
            name: 'st-paul',
            location: {
              lat: 52.48744798824191,
              lon: 13.394797928631306,
            },
          },
        },
        timestamp: 1579794628368,
      },
    ];

    downChecks = [
      {
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'down',
        },
        observer: {
          geo: {
            name: 'Berlin',
            location: {
              lat: 40.73060997761786,
              lon: -73.93524203449488,
            },
          },
        },
        timestamp: 1579794631464,
      },
      {
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'down',
        },
        observer: {
          geo: {
            name: 'Islamabad',
            location: {
              lat: 40.73060997761786,
              lon: -73.93524203449488,
            },
          },
        },
        timestamp: 1579794634220,
      },
      {
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'down',
        },
        observer: {
          geo: {
            name: 'st-paul',
            location: {
              lat: 52.48744798824191,
              lon: 13.394797928631306,
            },
          },
        },
        timestamp: 1579794628368,
      },
    ];

    checks = [
      {
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'up',
        },
        observer: {
          geo: {
            name: 'Berlin',
            location: {
              lat: 40.73060997761786,
              lon: -73.93524203449488,
            },
          },
        },
        timestamp: 1579794631464,
      },
      {
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'down',
        },
        observer: {
          geo: {
            name: 'Islamabad',
            location: {
              lat: 40.73060997761786,
              lon: -73.93524203449488,
            },
          },
        },
        timestamp: 1579794634220,
      },
      {
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'down',
        },
        observer: {
          geo: {
            name: 'st-paul',
            location: {
              lat: 52.48744798824191,
              lon: 13.394797928631306,
            },
          },
        },
        timestamp: 1579794628368,
      },
    ];
  });

  it('provides expected tooltip and display times', () => {
    const component = shallowWithIntl(
      <MonitorListStatusColumn status="up" timestamp="2314123" checks={[]} />
    );
    expect(component).toMatchSnapshot();
  });

  it('can handle a non-numeric timestamp value', () => {
    const component = shallowWithIntl(
      <MonitorListStatusColumn status="up" timestamp={new Date().toString()} checks={[]} />
    );
    expect(component).toMatchSnapshot();
  });

  it('will display location status', () => {
    const component = shallowWithIntl(
      <MonitorListStatusColumn status="up" timestamp={new Date().toString()} checks={checks} />
    );
    expect(component).toMatchSnapshot();
  });

  it('will render display location status', () => {
    const component = renderWithIntl(
      <MonitorListStatusColumn status="up" timestamp={new Date().toString()} checks={checks} />
    );
    expect(component).toMatchSnapshot();
  });

  it(' will test getLocationStatus location', () => {
    let statusMessage = getLocationStatus(checks, STATUS.UP);

    expect(statusMessage).toBe('in 1/3 Locations');

    statusMessage = getLocationStatus(checks, STATUS.DOWN);

    expect(statusMessage).toBe('in 2/3 Locations');

    statusMessage = getLocationStatus(upChecks, STATUS.UP);

    expect(statusMessage).toBe('in 3/3 Locations');

    statusMessage = getLocationStatus(downChecks, STATUS.UP);

    expect(statusMessage).toBe('in 0/3 Locations');
  });
});
