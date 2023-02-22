/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { populateAlertActions } from './alert_actions';
import { ActionConnector } from './types';
import { MONITOR_STATUS } from '../constants/uptime_alerts';
import { MONITOR_STATUS as SYNTHETICS_MONITOR_STATUS } from '../constants/synthetics_alerts';
import { MonitorStatusTranslations } from '../translations';
import { SyntheticsMonitorStatusTranslations } from './synthetics/translations';

describe('Legacy Alert Actions factory', () => {
  it('generate expected action for pager duty', async () => {
    const resp = populateAlertActions({
      groupId: MONITOR_STATUS.id,
      defaultActions: [
        {
          actionTypeId: '.pagerduty',
          group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
          params: {
            dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
            eventAction: 'trigger',
            severity: 'error',
            summary: MonitorStatusTranslations.defaultActionMessage,
          },
          id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        },
      ] as unknown as ActionConnector[],
      translations: {
        defaultActionMessage: MonitorStatusTranslations.defaultActionMessage,
        defaultRecoveryMessage: MonitorStatusTranslations.defaultRecoveryMessage,
        defaultSubjectMessage: MonitorStatusTranslations.defaultSubjectMessage,
      },
      isLegacy: true,
    });
    expect(resp).toEqual([
      {
        group: 'recovered',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: expect.any(String),
          eventAction: 'resolve',
          summary:
            'Alert for monitor {{context.monitorName}} with url {{{context.monitorUrl}}} from {{context.observerLocation}} has recovered',
        },
      },
      {
        group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: expect.any(String),
          eventAction: 'trigger',
          severity: 'error',
          summary: MonitorStatusTranslations.defaultActionMessage,
        },
      },
    ]);
  });

  it('generate expected action for index', async () => {
    const resp = populateAlertActions({
      groupId: MONITOR_STATUS.id,
      defaultActions: [
        {
          actionTypeId: '.index',
          group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
          params: {
            dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
            eventAction: 'trigger',
            severity: 'error',
            summary: MonitorStatusTranslations.defaultActionMessage,
          },
          id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        },
      ] as unknown as ActionConnector[],
      translations: {
        defaultActionMessage: MonitorStatusTranslations.defaultActionMessage,
        defaultRecoveryMessage: MonitorStatusTranslations.defaultRecoveryMessage,
        defaultSubjectMessage: MonitorStatusTranslations.defaultSubjectMessage,
      },
      isLegacy: true,
    });
    expect(resp).toEqual([
      {
        group: 'recovered',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          documents: [
            {
              latestErrorMessage: '',
              monitorName: '{{context.monitorName}}',
              monitorUrl: '{{{context.monitorUrl}}}',
              observerLocation: '{{context.observerLocation}}',
              statusMessage:
                'Alert for monitor {{context.monitorName}} with url {{{context.monitorUrl}}} from {{context.observerLocation}} has recovered',
            },
          ],
          indexOverride: null,
        },
      },
      {
        group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          documents: [
            {
              latestErrorMessage: '{{{context.latestErrorMessage}}}',
              monitorName: '{{context.monitorName}}',
              monitorUrl: '{{{context.monitorUrl}}}',
              observerLocation: '{{context.observerLocation}}',
              statusMessage: '{{{context.statusMessage}}}',
            },
          ],
          indexOverride: null,
        },
      },
    ]);
  });

  it('generate expected action for slack action connector', async () => {
    const resp = populateAlertActions({
      groupId: MONITOR_STATUS.id,
      defaultActions: [
        {
          actionTypeId: '.pagerduty',
          group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
          params: {
            dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
            eventAction: 'trigger',
            severity: 'error',
            summary:
              'Monitor {{context.monitorName}} with url {{{context.monitorUrl}}} from {{context.observerLocation}} {{{context.statusMessage}}} The latest error message is {{{context.latestErrorMessage}}}',
          },
          id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        },
      ] as unknown as ActionConnector[],
      translations: {
        defaultActionMessage: MonitorStatusTranslations.defaultActionMessage,
        defaultRecoveryMessage: MonitorStatusTranslations.defaultRecoveryMessage,
        defaultSubjectMessage: MonitorStatusTranslations.defaultSubjectMessage,
      },
    });
    expect(resp).toEqual([
      {
        group: 'recovered',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: expect.any(String),
          eventAction: 'resolve',
          summary:
            'Alert for monitor {{context.monitorName}} with url {{{context.monitorUrl}}} from {{context.observerLocation}} has recovered',
        },
      },
      {
        group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: expect.any(String),
          eventAction: 'trigger',
          severity: 'error',
          summary: MonitorStatusTranslations.defaultActionMessage,
        },
      },
    ]);
  });
});

describe('Alert Actions factory', () => {
  it('generate expected action for pager duty', async () => {
    const resp = populateAlertActions({
      groupId: SYNTHETICS_MONITOR_STATUS.id,
      defaultActions: [
        {
          actionTypeId: '.pagerduty',
          group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
          params: {
            dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
            eventAction: 'trigger',
            severity: 'error',
            summary: SyntheticsMonitorStatusTranslations.defaultActionMessage,
          },
          id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        },
      ] as unknown as ActionConnector[],
      translations: {
        defaultActionMessage: SyntheticsMonitorStatusTranslations.defaultActionMessage,
        defaultRecoveryMessage: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
        defaultSubjectMessage: SyntheticsMonitorStatusTranslations.defaultSubjectMessage,
      },
    });
    expect(resp).toEqual([
      {
        group: 'recovered',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: expect.any(String),
          eventAction: 'resolve',
          summary:
            'The alert for the monitor {{context.monitorName}} checking {{{context.monitorUrl}}} from {{context.locationName}} is no longer active: {{context.recoveryReason}}.',
        },
      },
      {
        group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: expect.any(String),
          eventAction: 'trigger',
          severity: 'error',
          summary: SyntheticsMonitorStatusTranslations.defaultActionMessage,
        },
      },
    ]);
  });

  it('generate expected action for index', async () => {
    const resp = populateAlertActions({
      groupId: SYNTHETICS_MONITOR_STATUS.id,
      defaultActions: [
        {
          actionTypeId: '.index',
          group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
          params: {
            dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
            eventAction: 'trigger',
            severity: 'error',
            summary: SyntheticsMonitorStatusTranslations.defaultActionMessage,
          },
          id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        },
      ] as unknown as ActionConnector[],
      translations: {
        defaultActionMessage: SyntheticsMonitorStatusTranslations.defaultActionMessage,
        defaultRecoveryMessage: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
        defaultSubjectMessage: SyntheticsMonitorStatusTranslations.defaultSubjectMessage,
      },
    });
    expect(resp).toEqual([
      {
        group: 'recovered',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          documents: [
            {
              latestErrorMessage: '{{{context.latestErrorMessage}}}',
              monitorName: '{{context.monitorName}}',
              monitorUrl: '{{{context.monitorUrl}}}',
              observerLocation: '{{context.locationName}}',
              statusMessage: '{{{context.status}}}',
              recoveryReason: '{{context.recoveryReason}}',
            },
          ],
          indexOverride: null,
        },
      },
      {
        group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          documents: [
            {
              latestErrorMessage: '{{{context.lastErrorMessage}}}',
              monitorName: '{{context.monitorName}}',
              monitorUrl: '{{{context.monitorUrl}}}',
              observerLocation: '{{context.locationName}}',
              statusMessage: '{{{context.status}}}',
            },
          ],
          indexOverride: null,
        },
      },
    ]);
  });

  it('generate expected action for slack action connector', async () => {
    const resp = populateAlertActions({
      groupId: SYNTHETICS_MONITOR_STATUS.id,
      defaultActions: [
        {
          actionTypeId: '.pagerduty',
          group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
          params: {
            dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
            eventAction: 'trigger',
            severity: 'error',
            summary:
              'Monitor {{context.monitorName}} with url {{{context.monitorUrl}}} from {{context.observerLocation}} {{{context.statusMessage}}} The latest error message is {{{context.latestErrorMessage}}}',
          },
          id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        },
      ] as unknown as ActionConnector[],
      translations: {
        defaultActionMessage: SyntheticsMonitorStatusTranslations.defaultActionMessage,
        defaultRecoveryMessage: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
        defaultSubjectMessage: SyntheticsMonitorStatusTranslations.defaultSubjectMessage,
      },
    });
    expect(resp).toEqual([
      {
        group: 'recovered',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: expect.any(String),
          eventAction: 'resolve',
          summary:
            'The alert for the monitor {{context.monitorName}} checking {{{context.monitorUrl}}} from {{context.locationName}} is no longer active: {{context.recoveryReason}}.',
        },
      },
      {
        group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: expect.any(String),
          eventAction: 'trigger',
          severity: 'error',
          summary: SyntheticsMonitorStatusTranslations.defaultActionMessage,
        },
      },
    ]);
  });
});
