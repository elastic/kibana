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
import { DynamicSettings } from '../runtime_types';
import { cloneDeep } from 'lodash';

describe('Alert Actions factory', () => {
  it('generate expected action for pager duty', async () => {
    const resp = populateAlertActions({
      groupId: SYNTHETICS_MONITOR_STATUS.id,
      settings: {
        defaultConnectors: ['f2a3b195-ed76-499a-805d-82d24d4eeba9'],
      } as DynamicSettings,
      allActionConnectors: [
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
          configIds: [],
          dedupKey: expect.any(String),
          eventAction: 'resolve',
          summary:
            'The alert for "{{context.monitorName}}" from {{context.locationName}} is no longer active: {{context.recoveryReason}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- From: {{context.locationName}}  \n- Last error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
        },
        alertsFilter: {
          query: {
            filters: [],
            kql: 'monitor.custom_connectors: false',
          },
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
          configIds: [],
          dedupKey: expect.any(String),
          eventAction: 'trigger',
          severity: 'error',
          summary: SyntheticsMonitorStatusTranslations.defaultActionMessage,
        },
        alertsFilter: {
          query: {
            filters: [],
            kql: 'monitor.custom_connectors: false',
          },
        },
      },
    ]);
  });

  it('generate expected action for index', async () => {
    const resp = populateAlertActions({
      groupId: SYNTHETICS_MONITOR_STATUS.id,
      settings: {
        defaultConnectors: ['f2a3b195-ed76-499a-805d-82d24d4eeba9'],
      } as DynamicSettings,
      allActionConnectors: [
        {
          frequency: {
            notifyWhen: 'onActionGroupChange',
            summary: false,
            throttle: null,
          },
          actionTypeId: '.index',
          group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
          params: {
            configIds: [],
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
          configIds: [],
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
        alertsFilter: {
          query: {
            filters: [],
            kql: 'monitor.custom_connectors: false',
          },
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
          configIds: [],
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
        alertsFilter: {
          query: {
            filters: [],
            kql: 'monitor.custom_connectors: false',
          },
        },
      },
    ]);
  });

  it('generate expected action for slack action connector', async () => {
    const resp = populateAlertActions({
      groupId: SYNTHETICS_MONITOR_STATUS.id,
      settings: {
        defaultConnectors: ['f2a3b195-ed76-499a-805d-82d24d4eeba9'],
      } as DynamicSettings,
      allActionConnectors: [
        {
          frequency: {
            notifyWhen: 'onActionGroupChange',
            summary: false,
            throttle: null,
          },
          actionTypeId: '.pagerduty',
          group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
          params: {
            configIds: [],
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
          configIds: [],
          dedupKey: expect.any(String),
          eventAction: 'resolve',
          summary:
            'The alert for "{{context.monitorName}}" from {{context.locationName}} is no longer active: {{context.recoveryReason}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- From: {{context.locationName}}  \n- Last error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
        },
        alertsFilter: {
          query: {
            filters: [],
            kql: 'monitor.custom_connectors: false',
          },
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
          configIds: [],
          dedupKey: expect.any(String),
          eventAction: 'trigger',
          severity: 'error',
          summary: SyntheticsMonitorStatusTranslations.defaultActionMessage,
        },
        alertsFilter: {
          query: {
            filters: [],
            kql: 'monitor.custom_connectors: false',
          },
        },
      },
    ]);
  });

  it('generate expected action for email action connector', async () => {
    const resp = populateAlertActions({
      groupId: SYNTHETICS_MONITOR_STATUS.id,
      settings: {
        defaultConnectors: ['f2a3b195-ed76-499a-805d-82d24d4eeba9'],
        defaultEmail: {
          to: ['test@email.com'],
        },
      } as DynamicSettings,
      allActionConnectors: [
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
            summary:
              'The alert for "{{context.monitorName}}" from {{context.locationName}} is no longer active: {{context.recoveryReason}}.\n\nDetails:\n\nMonitor name: {{context.monitorName}}\n{{context.monitorUrlLabel}}: {{{context.monitorUrl}}}\nMonitor type: {{context.monitorType}}\nFrom: {{context.locationName}}\nLatest error received: {{{context.lastErrorMessage}}}\n{{{context.linkMessage}}}',
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
          configIds: [],
          bcc: [],
          cc: [],
          kibanaFooterLink: {
            path: '',
            text: '',
          },
          message:
            'The alert for "{{context.monitorName}}" from {{context.locationName}} is no longer active: {{context.recoveryReason}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- From: {{context.locationName}}  \n- Last error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
          messageHTML: null,
          subject:
            '"{{context.monitorName}}" ({{context.locationName}}) {{context.recoveryStatus}} - Elastic Synthetics',
          to: ['test@email.com'],
        },
        alertsFilter: {
          query: {
            filters: [],
            kql: 'monitor.custom_connectors: false',
          },
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
          configIds: [],
          bcc: [],
          cc: [],
          kibanaFooterLink: {
            path: '',
            text: '',
          },
          message:
            '"{{context.monitorName}}" is {{{context.status}}} from {{context.locationName}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- Checked at: {{context.checkedAt}}  \n- From: {{context.locationName}}  \n- Error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
          messageHTML: null,
          subject:
            '"{{context.monitorName}}" ({{context.locationName}}) is down - Elastic Synthetics',
          to: ['test@email.com'],
        },
        alertsFilter: {
          query: {
            filters: [],
            kql: 'monitor.custom_connectors: false',
          },
        },
      },
    ]);
  });

  describe('generate default settings', () => {
    const translations = {
      defaultActionMessage: SyntheticsMonitorStatusTranslations.defaultActionMessage,
      defaultRecoveryMessage: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
      defaultSubjectMessage: SyntheticsMonitorStatusTranslations.defaultSubjectMessage,
      defaultRecoverySubjectMessage:
        SyntheticsMonitorStatusTranslations.defaultRecoverySubjectMessage,
    };
    const slackId = '3cd30fe0-5cc2-11ee-a1f2-9b8bdf1f46ff';
    const indexId = 'db523a20-5d75-11ee-aad0-3d5c3c42a9bb';
    const allActionConnectors = [
      {
        id: slackId,
        name: 'Slack 1',
        config: {},
        connector_type_id: '.slack',
        actionTypeId: '.slack',
        is_preconfigured: false,
        is_deprecated: false,
        referenced_by_count: 2,
        is_missing_secrets: false,
        is_system_action: false,
      },
      {
        id: indexId,
        name: 'index',
        config: {
          index: '.test-alerts',
          refresh: false,
          executionTimeField: null,
        },
        connector_type_id: '.index',
        actionTypeId: '.index',
        is_preconfigured: false,
        is_deprecated: false,
        referenced_by_count: 0,
        is_missing_secrets: false,
        is_system_action: false,
      },
    ] as unknown as ActionConnector[];

    const slackAct = {
      alertsFilter: {
        query: {
          filters: [],
          kql: 'monitor.custom_connectors: false',
        },
      },
      frequency: {
        notifyWhen: 'onActionGroupChange',
        summary: false,
        throttle: null,
      },
      group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
      id: '3cd30fe0-5cc2-11ee-a1f2-9b8bdf1f46ff',
      params: {
        configIds: [],
        message:
          '"{{context.monitorName}}" is {{{context.status}}} from {{context.locationName}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- Checked at: {{context.checkedAt}}  \n- From: {{context.locationName}}  \n- Error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
      },
    };

    const slackRecoveryAct = {
      alertsFilter: {
        query: {
          filters: [],
          kql: 'monitor.custom_connectors: false',
        },
      },
      frequency: {
        notifyWhen: 'onActionGroupChange',
        summary: false,
        throttle: null,
      },
      group: 'recovered',
      id: '3cd30fe0-5cc2-11ee-a1f2-9b8bdf1f46ff',
      params: {
        configIds: [],
        message:
          'The alert for "{{context.monitorName}}" from {{context.locationName}} is no longer active: {{context.recoveryReason}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- From: {{context.locationName}}  \n- Last error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
      },
    };

    const indexAct = {
      alertsFilter: {
        query: {
          filters: [],
          kql: 'monitor.custom_connectors: false',
        },
      },
      frequency: {
        notifyWhen: 'onActionGroupChange',
        summary: false,
        throttle: null,
      },
      group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
      id: 'db523a20-5d75-11ee-aad0-3d5c3c42a9bb',
      params: {
        configIds: [],
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
    };

    const indexRecoveryAct = {
      alertsFilter: {
        query: {
          filters: [],
          kql: 'monitor.custom_connectors: false',
        },
      },
      frequency: {
        notifyWhen: 'onActionGroupChange',
        summary: false,
        throttle: null,
      },
      group: 'recovered',
      id: 'db523a20-5d75-11ee-aad0-3d5c3c42a9bb',
      params: {
        configIds: [],
        documents: [
          {
            latestErrorMessage: '{{{context.latestErrorMessage}}}',
            monitorName: '{{context.monitorName}}',
            monitorUrl: '{{{context.monitorUrl}}}',
            observerLocation: '{{context.locationName}}',
            recoveryReason: '{{context.recoveryReason}}',
            statusMessage: '{{{context.status}}}',
          },
        ],
        indexOverride: null,
      },
    };

    it('should return actions for one default', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [slackId],
        } as DynamicSettings,
        allActionConnectors,
        translations,
      });
      expect(resp).toEqual([slackRecoveryAct, slackAct]);
    });

    it('should return actions for multiple defaults', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [slackId, indexId],
        } as DynamicSettings,
        allActionConnectors,
        translations,
      });
      expect(resp).toEqual([slackRecoveryAct, slackAct, indexRecoveryAct, indexAct]);
    });

    it('should return actions for none defaults', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
      });
      expect(resp).toEqual([]);
    });

    it('should remove actions for none defaults', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
        existingActions: [slackRecoveryAct, slackAct, indexAct] as any,
      });
      expect(resp).toEqual([]);
    });

    it('should add and remove defaults', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [indexId],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
        existingActions: [slackRecoveryAct, slackAct] as any,
      });
      expect(resp).toEqual([indexRecoveryAct, indexAct]);
    });

    it('should add monitor defaults with none', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
        monitorConnectors: [
          {
            configId: 'test-id',
          },
        ],
      });
      expect(resp).toEqual([]);
    });

    const slackMonRecoveryAct = {
      alertsFilter: {
        query: {
          filters: [],
          kql: 'configId: (test-id) and monitor.custom_connectors: true',
        },
      },
      frequency: {
        notifyWhen: 'onActionGroupChange',
        summary: false,
        throttle: null,
      },
      group: 'recovered',
      id: '3cd30fe0-5cc2-11ee-a1f2-9b8bdf1f46ff',
      params: {
        configIds: ['test-id'],
        message:
          'The alert for "{{context.monitorName}}" from {{context.locationName}} is no longer active: {{context.recoveryReason}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- From: {{context.locationName}}  \n- Last error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
      },
    };
    const slackMonAct = {
      alertsFilter: {
        query: {
          filters: [],
          kql: 'configId: (test-id) and monitor.custom_connectors: true',
        },
      },
      frequency: {
        notifyWhen: 'onActionGroupChange',
        summary: false,
        throttle: null,
      },
      group: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
      id: '3cd30fe0-5cc2-11ee-a1f2-9b8bdf1f46ff',
      params: {
        configIds: ['test-id'],
        message:
          '"{{context.monitorName}}" is {{{context.status}}} from {{context.locationName}}. - Elastic Synthetics\n\nDetails:\n\n- Monitor name: {{context.monitorName}}  \n- {{context.monitorUrlLabel}}: {{{context.monitorUrl}}}  \n- Monitor type: {{context.monitorType}}  \n- Checked at: {{context.checkedAt}}  \n- From: {{context.locationName}}  \n- Error received: {{{context.lastErrorMessage}}}  \n{{{context.linkMessage}}}',
      },
    };

    it('should add monitor defaults', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
        monitorConnectors: [
          {
            configId: 'test-id',
            addedConnectors: [slackId],
          },
        ],
      });
      expect(resp).toEqual([slackMonRecoveryAct, slackMonAct]);
    });

    it('should add monitor defaults with settings defaults', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [slackId],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
        monitorConnectors: [
          {
            configId: 'test-id',
            addedConnectors: [slackId],
          },
        ],
      });
      expect(resp).toEqual([slackRecoveryAct, slackAct, slackMonRecoveryAct, slackMonAct]);
    });

    it('should update monitor defaults with settings defaults removed', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
        monitorConnectors: [
          {
            configId: 'test-id',
            addedConnectors: [slackId],
          },
        ],
        existingActions: [slackRecoveryAct, slackAct, slackMonRecoveryAct, slackMonAct] as any,
      });
      expect(resp).toEqual([slackMonRecoveryAct, slackMonAct]);
    });

    it('should removes monitor defaults with settings defaults', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [slackId],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
        monitorConnectors: [
          {
            configId: 'test-id',
            removedConnectors: [slackId],
          },
        ],
        existingActions: [slackRecoveryAct, slackAct, slackMonRecoveryAct, slackMonAct] as any,
      });
      expect(resp).toEqual([slackRecoveryAct, slackAct]);
    });

    it('should removes monitor defaults with settings defaults also removed', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
        monitorConnectors: [
          {
            configId: 'test-id',
            removedConnectors: [slackId],
          },
        ],
        existingActions: [slackRecoveryAct, slackAct, slackMonRecoveryAct, slackMonAct] as any,
      });
      expect(resp).toEqual([]);
    });

    const slackMonRecoveryAct2 = cloneDeep(slackMonRecoveryAct);
    slackMonRecoveryAct2.alertsFilter.query.kql =
      'configId: (test-id or test-id-2) and monitor.custom_connectors: true';
    slackMonRecoveryAct2.params.configIds = ['test-id', 'test-id-2'];
    const slackMonAct2 = cloneDeep(slackMonAct);
    slackMonAct2.alertsFilter.query.kql =
      'configId: (test-id or test-id-2) and monitor.custom_connectors: true';
    slackMonAct2.params.configIds = ['test-id', 'test-id-2'];

    it('should add monitor defaults with already added config', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [slackId],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
        monitorConnectors: [
          {
            configId: 'test-id-2',
            addedConnectors: [slackId],
          },
        ],
        existingActions: cloneDeep([
          slackRecoveryAct,
          slackAct,
          slackMonRecoveryAct,
          slackMonAct,
        ]) as any,
      });

      expect(resp).toEqual([slackMonRecoveryAct2, slackMonAct2, slackRecoveryAct, slackAct]);
    });

    it('should remove monitor defaults with already added config', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [slackId],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
        monitorConnectors: [
          {
            configId: 'test-id-2',
            removedConnectors: [slackId],
          },
        ],
        existingActions: cloneDeep([
          slackRecoveryAct,
          slackAct,
          slackMonRecoveryAct2,
          slackMonAct2,
        ]) as any,
      });

      expect(resp).toEqual([slackMonRecoveryAct, slackMonAct, slackRecoveryAct, slackAct]);
    });

    it('should remove both monitor defaults', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [slackId],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
        monitorConnectors: [
          {
            configId: 'test-id-2',
            removedConnectors: [slackId],
          },
          {
            configId: 'test-id',
            removedConnectors: [slackId],
          },
        ],
        existingActions: cloneDeep([
          slackRecoveryAct,
          slackAct,
          slackMonRecoveryAct2,
          slackMonAct2,
        ]) as any,
      });

      expect(resp).toEqual([slackRecoveryAct, slackAct]);
    });

    it('should add multiple monitor defaults with settings', function () {
      const resp = populateAlertActions({
        groupId: SYNTHETICS_MONITOR_STATUS.id,
        settings: {
          defaultConnectors: [slackId],
        } as unknown as DynamicSettings,
        allActionConnectors,
        translations,
        monitorConnectors: [
          {
            configId: 'test-id',
            addedConnectors: [slackId],
          },
          {
            configId: 'test-id-2',
            addedConnectors: [slackId],
          },
        ],
        existingActions: cloneDeep([slackRecoveryAct, slackAct]) as any,
      });

      expect(resp).toEqual([slackRecoveryAct, slackAct, slackMonRecoveryAct2, slackMonAct2]);
    });
  });
});
