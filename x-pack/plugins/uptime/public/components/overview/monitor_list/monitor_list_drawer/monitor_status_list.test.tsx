/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MonitorStatusList } from './monitor_status_list';
import { Ping } from '../../../../../common/runtime_types';
import { mockMoment } from '../../../../lib/helper/test_helpers';
import { render } from '../../../../lib/helper/rtl_helpers';

describe('MonitorStatusList component', () => {
  let pings: Ping[];

  beforeAll(() => {
    mockMoment();
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
        docId: '8',
        monitor: {
          ip: '8c94:2b92::132',
          name: 'upMonitor',
          status: 'up',
          id: 'myUpMonitor',
          type: 'icmp',
          duration: { us: 234 },
        },
        observer: {
          geo: {
            name: 'fairbanks',
          },
        },
        timestamp: '1570538235890',
      },
    ];
  });

  it.each(['up', 'down'])(
    'renders call out for monitor location if monitors have no location',
    (status) => {
      const { getByRole, getByText } = render(
        <MonitorStatusList
          summaryPings={pings.map((ping) => {
            // test only up, only down
            ping.monitor.status = status;
            return ping;
          })}
        />
      );

      getByText('Some heartbeat instances do not have a location defined.', {
        // contains other elements/text
        exact: false,
      });
      const docsLink = getByRole('link');
      expect(docsLink.getAttribute('href')).toContain('https://www.elastic.co');
    }
  );

  it('does not render call out for monitor location if all monitors have location', () => {
    const { queryByRole, queryByText } = render(
      <MonitorStatusList
        summaryPings={pings.map((ping) => ({
          ...ping,
          ...{ observer: { geo: { name: 'test-name' } } },
        }))}
      />
    );

    expect(
      queryByText('Some heartbeat instances do not have a location defined.', { exact: false })
    ).toBeNull();
    expect(queryByRole('link')).toBeNull();
  });

  it.each([
    [
      'up',
      'Up',
      'A list of locations with "up" status when last checked.',
      'Down',
      'A list of locations with "down" status when last checked.',
    ],
    [
      'down',
      'Down',
      'A list of locations with "down" status when last checked.',
      'Up',
      'A list of locations with "up" status when last checked.',
    ],
  ])(
    'renders only up badge when there are no down checks',
    (
      statusToFilter,
      statusText,
      expectedLabel,
      expectedMissingStatusText,
      expectedMissingLabel
    ) => {
      const { getByText, getByLabelText, queryByText, queryByLabelText } = render(
        <MonitorStatusList
          summaryPings={pings.filter(({ monitor: { status } }) => status === statusToFilter)}
        />
      );
      expect(getByText(statusText));
      expect(getByLabelText(expectedLabel));
      expect(queryByText(expectedMissingStatusText)).toBeNull();
      expect(queryByLabelText(expectedMissingLabel)).toBeNull();
    }
  );

  it('displays badges for up and down locations when the results are mixed', () => {
    const { getByText, getByLabelText } = render(<MonitorStatusList summaryPings={pings} />);
    expect(getByText('Up'));
    expect(getByLabelText('A list of locations with "up" status when last checked.'));
    expect(getByText('fairbanks'));
    expect(getByText('Down'));
    expect(getByLabelText('A list of locations with "down" status when last checked.'));
    expect(getByText('Unnamed-location'));
  });

  it('displays a location as "down" if any summary checks are down', () => {
    const newlyUpPings = [
      {
        docId: '100',
        monitor: {
          ip: '8c94:2b92::132',
          name: 'monitor',
          status: 'down',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 234 },
        },
        observer: {
          geo: {
            name: 'fairbanks',
          },
        },
        timestamp: '1570538235890',
      },
      {
        docId: '101',
        monitor: {
          ip: '8c94:2b92::132',
          name: 'monitor',
          status: 'down',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 234 },
        },
        observer: {
          geo: {
            name: 'fairbanks',
          },
        },
        timestamp: '1570538236890',
      },
      {
        docId: '101',
        monitor: {
          ip: '8c94:2b92::132',
          name: 'monitor',
          status: 'up',
          id: 'myMonitor',
          type: 'icmp',
          duration: { us: 234 },
        },
        observer: {
          geo: {
            name: 'fairbanks',
          },
        },
        timestamp: '1570538237890',
      },
    ];
    const { getByText, getByLabelText } = render(<MonitorStatusList summaryPings={newlyUpPings} />);
    expect(getByText('Down'));
    const locationContainer = getByLabelText(
      'A list of locations with "down" status when last checked.'
    );
    expect(locationContainer.innerHTML).toBe('fairbanks');
  });
});
