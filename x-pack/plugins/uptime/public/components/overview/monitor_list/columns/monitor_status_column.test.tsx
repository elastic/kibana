/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getLocationStatus, MonitorListStatusColumn } from './monitor_status_column';
import { Ping } from '../../../../../common/runtime_types';
import { STATUS } from '../../../../../common/constants';
import { EuiThemeProvider } from '../../../../../../../../src/plugins/kibana_react/common';
import { mockDate, mockMoment } from '../../../../lib/helper/test_helpers';
import { render } from '../../../../lib/helper/rtl_helpers';
import { fireEvent, screen, waitFor } from '@testing-library/react';

describe('MonitorListStatusColumn', () => {
  beforeAll(() => {
    mockDate();
    mockMoment();
  });

  let upChecks: Ping[];

  let downChecks: Ping[];

  let summaryPings: Ping[];

  beforeEach(() => {
    upChecks = [
      {
        docId: '1',
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'up',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
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
        timestamp: '1579794631464',
      },
      {
        docId: '2',
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'up',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
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
        timestamp: '1579794634220',
      },
      {
        docId: '3',
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'up',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
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
        timestamp: '1579794628368',
      },
    ];

    downChecks = [
      {
        docId: '4',
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'down',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
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
        timestamp: '1579794631464',
      },
      {
        docId: '5',
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'down',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
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
        timestamp: '1579794634220',
      },
      {
        docId: '6',
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'down',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
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
        timestamp: '1579794628368',
      },
    ];

    summaryPings = [
      {
        docId: '7',
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'up',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
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
        timestamp: '1579794631464',
      },
      {
        docId: '8',
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'down',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
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
        timestamp: '1579794634220',
      },
      {
        docId: '9',
        monitor: {
          ip: '104.86.46.103',
          name: '',
          status: 'down',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 123 },
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
        timestamp: '1579794628368',
      },
    ];
  });

  it('provides expected tooltip and display times', async () => {
    const { getByText } = render(
      <EuiThemeProvider darkMode={false}>
        <MonitorListStatusColumn
          status="up"
          timestamp="2314123"
          summaryPings={[]}
          monitorType="http"
        />
      </EuiThemeProvider>
    );

    const timestamp = getByText('Sept 4, 2020', { exact: false });
    expect(timestamp.innerHTML).toEqual('Checked Sept 4, 2020  9:31:38 AM');

    fireEvent.mouseOver(timestamp);

    await waitFor(() => screen.getByText('Thu May 09 2019 10:15:11 GMT-0400'));
  });

  it('can handle a non-numeric timestamp value', () => {
    const { getByText } = render(
      <EuiThemeProvider darkMode={false}>
        <MonitorListStatusColumn
          status="up"
          timestamp={new Date().toString()}
          summaryPings={[]}
          monitorType="http"
        />
      </EuiThemeProvider>
    );

    expect(getByText('Sept 4, 2020', { exact: false }).innerHTML).toEqual(
      'Checked Sept 4, 2020  9:31:38 AM'
    );
  });

  it('displays single location status', async () => {
    const { getByText } = render(
      <EuiThemeProvider darkMode={false}>
        <MonitorListStatusColumn
          status="up"
          timestamp={new Date().toString()}
          monitorType="http"
          summaryPings={summaryPings.filter((ping) => ping.observer!.geo!.name! === 'Islamabad')}
        />
      </EuiThemeProvider>
    );

    const locationsContainer = getByText('in 0/1 location', { exact: false });

    fireEvent.mouseOver(locationsContainer);

    await waitFor(() => screen.getByText('Down in Islamabad'));
  });

  it('will display location status', async () => {
    const { getByText } = render(
      <EuiThemeProvider darkMode={false}>
        <MonitorListStatusColumn
          status="up"
          timestamp={new Date().toString()}
          summaryPings={summaryPings}
          monitorType="http"
        />
      </EuiThemeProvider>
    );

    const locationsContainer = getByText('in 1/3 locations', { exact: false });

    fireEvent.mouseOver(locationsContainer);

    await waitFor(() => screen.getByText('Up in Berlin'));
    await waitFor(() => screen.getByText('Down in Islamabad, st-paul'));
  });

  it('will render display location status', async () => {
    const { getByText } = render(
      <EuiThemeProvider darkMode={false}>
        <MonitorListStatusColumn
          status="up"
          monitorType="http"
          timestamp={new Date().toString()}
          summaryPings={summaryPings}
        />
      </EuiThemeProvider>
    );

    const timestamp = getByText('Sept 4, 2020', { exact: false });

    expect(timestamp.innerHTML).toEqual('Checked Sept 4, 2020  9:31:38 AM');
    expect(getByText('in 1/3 locations,'));
  });

  it('will test getLocationStatus location', () => {
    let { statusMessage } = getLocationStatus(summaryPings, STATUS.UP);

    expect(statusMessage).toBe('in 1/3 locations');

    statusMessage = getLocationStatus(summaryPings, STATUS.DOWN).statusMessage;

    expect(statusMessage).toBe('in 2/3 locations');

    statusMessage = getLocationStatus(upChecks, STATUS.UP).statusMessage;

    expect(statusMessage).toBe('in 3/3 locations');

    statusMessage = getLocationStatus(downChecks, STATUS.UP).statusMessage;

    expect(statusMessage).toBe('in 0/3 locations');
  });
});
