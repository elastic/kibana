/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import 'jest';
import React from 'react';
import { MonitorListDrawerComponent } from '../monitor_list_drawer';
import { MonitorDetails, MonitorSummary, makePing } from '../../../../../../common/runtime_types';
import { shallowWithRouter } from '../../../../../lib';

describe('MonitorListDrawer component', () => {
  let summary: MonitorSummary;
  let monitorDetails: MonitorDetails;

  beforeEach(() => {
    summary = {
      monitor_id: 'foo',
      state: {
        monitor: {},
        summaryPings: [
          makePing({
            docId: 'foo',
            id: 'foo',
            ip: '127.0.0.1',
            type: 'icmp',
            status: 'up',
            timestamp: '121',
            duration: 121,
          }),
        ],
        summary: {
          up: 1,
          down: 0,
        },
        timestamp: '123',
        url: {
          domain: 'expired.badssl.com',
          full: 'https://expired.badssl.com',
        },
      },
    };
    monitorDetails = {
      monitorId: 'bad-ssl',
      error: {
        type: 'io',
        message:
          'Get https://expired.badssl.com: x509: certificate has expired or is not yet valid',
      },
    };
  });

  it('renders nothing when no summary data is present', () => {
    const component = shallowWithRouter(
      <MonitorListDrawerComponent summary={summary} monitorDetails={monitorDetails} />
    );
    expect(component).toEqual({});
  });

  it('renders nothing when no check data is present', () => {
    delete summary.state.summaryPings;
    const component = shallowWithRouter(
      <MonitorListDrawerComponent summary={summary} monitorDetails={monitorDetails} />
    );
    expect(component).toEqual({});
  });

  it('renders a MonitorListDrawer when there is only one check', () => {
    const component = shallowWithRouter(
      <MonitorListDrawerComponent summary={summary} monitorDetails={monitorDetails} />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders a MonitorListDrawer when there are many checks', () => {
    for (let i = 0; i < 3; i++) {
      summary.state.summaryPings.push(
        makePing({
          docId: `foo-${i}`,
          id: 'foo',
          ip: `127.0.0.${1 + i}`,
          type: 'icmp',
          timestamp: `${i}`,
          duration: i,
          status: i % 2 !== 0 ? 'up' : 'down',
        })
      );
    }

    const component = shallowWithRouter(
      <MonitorListDrawerComponent summary={summary} monitorDetails={monitorDetails} />
    );
    expect(component).toMatchSnapshot();
  });
});
