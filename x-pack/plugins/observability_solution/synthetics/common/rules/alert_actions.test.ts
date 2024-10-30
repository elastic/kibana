/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { populateAlertActions } from './alert_actions';
import { ActionConnector } from './types';
import { MONITOR_STATUS as SYNTHETICS_MONITOR_STATUS } from '../constants/synthetics_alerts';
import { SyntheticsMonitorStatusTranslations } from './synthetics/translations';

describe('Alert Actions factory', () => {
  it('generate expected action for pager duty', async () => {
    const resp = populateAlertActions({
      groupId: SYNTHETICS_MONITOR_STATUS.id,
      defaultActions: [
        {
          frequency: {
            notifyWhen: 'onActionGroupChange',
            summary: false,
            throttle: null,
          },
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
        defaultRecoverySubjectMessage:
          SyntheticsMonitorStatusTranslations.defaultRecoverySubjectMessage,
      },
    });
    expect(resp).toEqual([
      {
        frequency: {
          notifyWhen: 'onActionGroupChange',
          summary: false,
          throttle: null,
        },
        group: 'recovered',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: expect.any(String),
          eventAction: 'resolve',
          summary:
            'The alert for monitor "{{context.monitorName}}" from {{context.locationNames}} is no longer active: {{context.recoveryReason}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- From: {{context.locationNames}}  \n- Last error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
        },
      },
      {
        frequency: {
          notifyWhen: 'onActionGroupChange',
          summary: false,
          throttle: null,
        },
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
          frequency: {
            notifyWhen: 'onActionGroupChange',
            summary: false,
            throttle: null,
          },
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
        defaultRecoverySubjectMessage:
          SyntheticsMonitorStatusTranslations.defaultRecoverySubjectMessage,
      },
    });
    expect(resp).toEqual([
      {
        frequency: {
          notifyWhen: 'onActionGroupChange',
          summary: false,
          throttle: null,
        },
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
        frequency: {
          notifyWhen: 'onActionGroupChange',
          summary: false,
          throttle: null,
        },
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
          frequency: {
            notifyWhen: 'onActionGroupChange',
            summary: false,
            throttle: null,
          },
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
        defaultRecoverySubjectMessage:
          SyntheticsMonitorStatusTranslations.defaultRecoverySubjectMessage,
      },
    });
    expect(resp).toEqual([
      {
        frequency: {
          notifyWhen: 'onActionGroupChange',
          summary: false,
          throttle: null,
        },
        group: 'recovered',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          dedupKey: expect.any(String),
          eventAction: 'resolve',
          summary:
            'The alert for monitor "{{context.monitorName}}" from {{context.locationNames}} is no longer active: {{context.recoveryReason}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- From: {{context.locationNames}}  \n- Last error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
        },
      },
      {
        frequency: {
          notifyWhen: 'onActionGroupChange',
          summary: false,
          throttle: null,
        },
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

  it('generate expected action for email action connector', async () => {
    const resp = populateAlertActions({
      groupId: SYNTHETICS_MONITOR_STATUS.id,
      defaultActions: [
        {
          frequency: {
            notifyWhen: 'onActionGroupChange',
            summary: false,
            throttle: null,
          },
          actionTypeId: '.email',
          group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
          params: {
            dedupKey: 'always-downxpack.uptime.alerts.actionGroups.monitorStatus',
            eventAction: 'trigger',
            severity: 'error',
            summary: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
          },
          id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        },
      ] as unknown as ActionConnector[],
      defaultEmail: {
        to: ['test@email.com'],
      },
      translations: {
        defaultActionMessage: SyntheticsMonitorStatusTranslations.defaultActionMessage,
        defaultRecoveryMessage: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
        defaultSubjectMessage: SyntheticsMonitorStatusTranslations.defaultSubjectMessage,
        defaultRecoverySubjectMessage:
          SyntheticsMonitorStatusTranslations.defaultRecoverySubjectMessage,
      },
    });
    expect(resp).toEqual([
      {
        frequency: {
          notifyWhen: 'onActionGroupChange',
          summary: false,
          throttle: null,
        },
        group: 'recovered',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          bcc: [],
          cc: [],
          kibanaFooterLink: {
            path: '',
            text: '',
          },
          message: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
          messageHTML: null,
          subject: SyntheticsMonitorStatusTranslations.defaultRecoverySubjectMessage,
          to: ['test@email.com'],
        },
      },
      {
        frequency: {
          notifyWhen: 'onActionGroupChange',
          summary: false,
          throttle: null,
        },
        group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
        id: 'f2a3b195-ed76-499a-805d-82d24d4eeba9',
        params: {
          bcc: [],
          cc: [],
          kibanaFooterLink: {
            path: '',
            text: '',
          },
          message: SyntheticsMonitorStatusTranslations.defaultActionMessage,
          messageHTML: null,
          subject: SyntheticsMonitorStatusTranslations.defaultSubjectMessage,
          to: ['test@email.com'],
        },
      },
    ]);
  });
});
