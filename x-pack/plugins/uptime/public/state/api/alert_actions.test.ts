/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { populateAlertActions } from './alert_actions';
import { ActionConnector } from '../alerts/alerts';

const selectedMonitor = {
  docId: 'X5dkPncBy0xTcvZ347hy',
  timestamp: '2021-01-26T11:12:14.519Z',
  '@timestamp': '2021-01-26T11:12:14.519Z',
  url: { scheme: 'tcp', domain: 'localhost', port: 18278, full: 'tcp://localhost:18278' },
  error: { type: 'io', message: 'dial tcp 127.0.0.1:18278: connect: connection refused' },
  ecs: { version: '1.7.0' },
  resolve: { ip: '127.0.0.1', rtt: { us: 410 } },
  summary: { down: 1, up: 0 },
  monitor: {
    ip: '127.0.0.1',
    name: 'Always Down Local Port',
    type: 'tcp',
    timespan: { gte: '2021-01-26T11:12:14.519Z', lt: '2021-01-26T11:17:14.519Z' },
    id: 'always-down',
    status: 'down',
    duration: { us: 695 },
    check_group: 'a53b0003-5fc6-11eb-9241-42010a84000f',
  },
  event: { dataset: 'uptime' },
  agent: {
    ephemeral_id: '7d86e765-9f29-46e6-b1ec-047b09b4074e',
    id: '7c9d2825-614f-4906-a13e-c9db1c6e5585',
    name: 'gke-edge-oblt-edge-oblt-pool-c9faf257-m1ci',
    type: 'heartbeat',
    version: '8.0.0',
  },
};

describe('Alert Actions factory', () => {
  it('generate expected action for pager duty', async () => {
    const resp = populateAlertActions({
      selectedMonitor,
      defaultActions: [
        {
          actionTypeId: '.pagerduty',
          group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
          params: {
            dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
            eventAction: 'trigger',
            severity: 'error',
            summary:
              'Monitor {{state.monitorName}} with url {{{state.monitorUrl}}} from {{state.observerLocation}} {{{state.statusMessage}}} The latest error message is {{{state.latestErrorMessage}}}',
          },
          id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        },
      ] as unknown as ActionConnector[],
    });
    expect(resp).toEqual([
      {
        group: 'recovered',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
          eventAction: 'resolve',
          summary:
            'Monitor Always Down Local Port with url tcp://localhost:18278 has recovered with status Up',
        },
      },
      {
        group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
          eventAction: 'trigger',
          severity: 'error',
          summary:
            'Monitor {{state.monitorName}} with url {{{state.monitorUrl}}} from {{state.observerLocation}} {{{state.statusMessage}}} The latest error message is {{{state.latestErrorMessage}}}',
        },
      },
    ]);
  });

  it('generate expected action for slack action connector', async () => {
    const resp = populateAlertActions({
      selectedMonitor,
      defaultActions: [
        {
          actionTypeId: '.pagerduty',
          group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
          params: {
            dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
            eventAction: 'trigger',
            severity: 'error',
            summary:
              'Monitor {{state.monitorName}} with url {{{state.monitorUrl}}} from {{state.observerLocation}} {{{state.statusMessage}}} The latest error message is {{{state.latestErrorMessage}}}',
          },
          id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        },
      ] as unknown as ActionConnector[],
    });
    expect(resp).toEqual([
      {
        group: 'recovered',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
          eventAction: 'resolve',
          summary:
            'Monitor Always Down Local Port with url tcp://localhost:18278 has recovered with status Up',
        },
      },
      {
        group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
          eventAction: 'trigger',
          severity: 'error',
          summary:
            'Monitor {{state.monitorName}} with url {{{state.monitorUrl}}} from {{state.observerLocation}} {{{state.statusMessage}}} The latest error message is {{{state.latestErrorMessage}}}',
        },
      },
    ]);
  });
});
