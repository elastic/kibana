/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { RulesPage } from './index';
import { RulesTable } from './components/rules_table';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import * as pluginContext from '../../hooks/use_plugin_context';
import { KibanaPageTemplate } from '../../../../../../src/plugins/kibana_react/public';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { AppMountParameters } from 'kibana/public';
import { ALERTS_FEATURE_ID } from '../../../../alerting/common';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

jest.mock('../../hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

jest.mock('../../hooks/use_fetch_rules', () => ({
  useFetchRules: jest.fn(),
}));

jest.mock('../../../../triggers_actions_ui/public', () => ({
  useLoadRuleTypes: jest.fn(),
}));

jest.spyOn(pluginContext, 'usePluginContext').mockImplementation(() => ({
  appMountParameters: {} as AppMountParameters,
  config: {
    unsafe: {
      alertingExperience: { enabled: true },
      cases: { enabled: true },
      overviewNext: { enabled: false },
      rules: { enabled: true },
    },
  },
  observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
  ObservabilityPageTemplate: KibanaPageTemplate,
  kibanaFeatures: [],
}));

const { useFetchRules } = jest.requireMock('../../hooks/use_fetch_rules');
const { useLoadRuleTypes } = jest.requireMock('../../../../triggers_actions_ui/public');

describe('empty RulesPage', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
    const rulesState = {
      isLoading: false,
      data: [],
      error: null,
      totalItemCount: 0,
    };

    useLoadRuleTypes.mockReturnValue({
      ruleTypes: [
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'xpack.uptime.alerts.actionGroups.monitorStatus',
              name: 'Uptime Down Monitor',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'xpack.uptime.alerts.actionGroups.monitorStatus',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                name: 'message',
                description: 'A generated message summarizing the currently down monitors',
              },
              {
                name: 'downMonitorsWithGeo',
                description:
                  'A generated summary that shows some or all of the monitors detected as down by the alert',
              },
              {
                name: 'reason',
                description: 'A concise description of the reason for the alert',
              },
              {
                name: 'viewInAppUrl',
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
              },
            ],
            state: [
              {
                name: 'monitorName',
                description:
                  'A human friendly rendering of name or ID, preferring name (e.g. My Monitor)',
              },
              {
                name: 'monitorId',
                description: 'ID of the monitor.',
              },
              {
                name: 'monitorUrl',
                description: 'URL of the monitor.',
              },
              {
                name: 'monitorType',
                description: 'Type (e.g. HTTP/TCP) of the monitor.',
              },
              {
                name: 'statusMessage',
                description:
                  'Status message e.g down or is below availability threshold in case of availability check or both.',
              },
              {
                name: 'latestErrorMessage',
                description: 'Monitor latest error message',
              },
              {
                name: 'observerLocation',
                description: 'Observer location from which heartbeat check is performed.',
              },
              {
                name: 'observerHostname',
                description: 'Observer hostname from which heartbeat check is performed.',
              },
              {
                name: 'firstCheckedAt',
                description: 'Timestamp indicating when this alert first checked',
              },
              {
                name: 'firstTriggeredAt',
                description: 'Timestamp indicating when the alert first triggered',
              },
              {
                name: 'currentTriggerStarted',
                description:
                  'Timestamp indicating when the current trigger state began, if alert is triggered',
              },
              {
                name: 'isTriggered',
                description: 'Flag indicating if the alert is currently triggering',
              },
              {
                name: 'lastCheckedAt',
                description: "Timestamp indicating the alert's most recent check time",
              },
              {
                name: 'lastResolvedAt',
                description: 'Timestamp indicating the most recent resolution time for this alert',
              },
              {
                name: 'lastTriggeredAt',
                description: "Timestamp indicating the alert's most recent trigger time",
              },
            ],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'xpack.uptime.alerts.monitorStatus',
          name: 'Uptime monitor status',
          producer: 'uptime',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'xpack.uptime.alerts.actionGroups.tlsCertificate',
              name: 'Uptime TLS Alert',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'xpack.uptime.alerts.actionGroups.tlsCertificate',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [],
            state: [
              {
                name: 'count',
                description: 'The number of certs detected by the alert executor',
              },
              {
                name: 'expiringCount',
                description: 'The number of expiring certs detected by the alert.',
              },
              {
                name: 'expiringCommonNameAndDate',
                description: 'The common names and expiration date/time of the detected certs',
              },
              {
                name: 'agingCount',
                description: 'The number of detected certs that are becoming too old.',
              },
              {
                name: 'agingCommonNameAndDate',
                description: 'The common names and expiration date/time of the detected certs.',
              },
              {
                name: 'firstCheckedAt',
                description: 'Timestamp indicating when this alert first checked',
              },
              {
                name: 'firstTriggeredAt',
                description: 'Timestamp indicating when the alert first triggered',
              },
              {
                name: 'currentTriggerStarted',
                description:
                  'Timestamp indicating when the current trigger state began, if alert is triggered',
              },
              {
                name: 'isTriggered',
                description: 'Flag indicating if the alert is currently triggering',
              },
              {
                name: 'lastCheckedAt',
                description: "Timestamp indicating the alert's most recent check time",
              },
              {
                name: 'lastResolvedAt',
                description: 'Timestamp indicating the most recent resolution time for this alert',
              },
              {
                name: 'lastTriggeredAt',
                description: "Timestamp indicating the alert's most recent trigger time",
              },
            ],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'xpack.uptime.alerts.tlsCertificate',
          name: 'Uptime TLS',
          producer: 'uptime',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'xpack.uptime.alerts.actionGroups.durationAnomaly',
              name: 'Uptime Duration Anomaly',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'xpack.uptime.alerts.actionGroups.durationAnomaly',
          minimumLicenseRequired: 'platinum',
          actionVariables: {
            context: [
              {
                name: 'reason',
                description: 'A concise description of the reason for the alert',
              },
              {
                name: 'viewInAppUrl',
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
              },
            ],
            state: [
              {
                name: 'severity',
                description: 'The severity of the anomaly.',
              },
              {
                name: 'anomalyStartTimestamp',
                description: 'ISO8601 timestamp of the start of the anomaly.',
              },
              {
                name: 'monitor',
                description:
                  'A human friendly rendering of name or ID, preferring name (e.g. My Monitor)',
              },
              {
                name: 'monitorId',
                description: 'ID of the monitor.',
              },
              {
                name: 'monitorUrl',
                description: 'URL of the monitor.',
              },
              {
                name: 'slowestAnomalyResponse',
                description:
                  'Slowest response time during anomaly bucket with unit (ms, s) attached.',
              },
              {
                name: 'expectedResponseTime',
                description: 'Expected response time',
              },
              {
                name: 'severityScore',
                description: 'Anomaly severity score',
              },
              {
                name: 'observerLocation',
                description: 'Observer location from which heartbeat check is performed.',
              },
              {
                name: 'firstCheckedAt',
                description: 'Timestamp indicating when this alert first checked',
              },
              {
                name: 'firstTriggeredAt',
                description: 'Timestamp indicating when the alert first triggered',
              },
              {
                name: 'currentTriggerStarted',
                description:
                  'Timestamp indicating when the current trigger state began, if alert is triggered',
              },
              {
                name: 'isTriggered',
                description: 'Flag indicating if the alert is currently triggering',
              },
              {
                name: 'lastCheckedAt',
                description: "Timestamp indicating the alert's most recent check time",
              },
              {
                name: 'lastResolvedAt',
                description: 'Timestamp indicating the most recent resolution time for this alert',
              },
              {
                name: 'lastTriggeredAt',
                description: "Timestamp indicating the alert's most recent trigger time",
              },
            ],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'xpack.uptime.alerts.durationAnomaly',
          name: 'Uptime Duration Anomaly',
          producer: 'uptime',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'xpack.uptime.alerts.actionGroups.tls',
              name: 'Uptime TLS Alert (Legacy)',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'xpack.uptime.alerts.actionGroups.tls',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [],
            state: [
              {
                name: 'count',
                description: 'The number of certs detected by the alert executor',
              },
              {
                name: 'expiringCount',
                description: 'The number of expiring certs detected by the alert.',
              },
              {
                name: 'expiringCommonNameAndDate',
                description: 'The common names and expiration date/time of the detected certs',
              },
              {
                name: 'agingCount',
                description: 'The number of detected certs that are becoming too old.',
              },
              {
                name: 'agingCommonNameAndDate',
                description: 'The common names and expiration date/time of the detected certs.',
              },
              {
                name: 'firstCheckedAt',
                description: 'Timestamp indicating when this alert first checked',
              },
              {
                name: 'firstTriggeredAt',
                description: 'Timestamp indicating when the alert first triggered',
              },
              {
                name: 'currentTriggerStarted',
                description:
                  'Timestamp indicating when the current trigger state began, if alert is triggered',
              },
              {
                name: 'isTriggered',
                description: 'Flag indicating if the alert is currently triggering',
              },
              {
                name: 'lastCheckedAt',
                description: "Timestamp indicating the alert's most recent check time",
              },
              {
                name: 'lastResolvedAt',
                description: 'Timestamp indicating the most recent resolution time for this alert',
              },
              {
                name: 'lastTriggeredAt',
                description: "Timestamp indicating the alert's most recent trigger time",
              },
            ],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'xpack.uptime.alerts.tls',
          name: 'Uptime TLS (Legacy)',
          producer: 'uptime',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'metrics.anomaly.fired',
              name: 'Fired',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'metrics.anomaly.fired',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                name: 'alertState',
                description: 'Current state of the alert',
              },
              {
                name: 'metric',
                description: 'The metric name in the specified condition.',
              },
              {
                name: 'timestamp',
                description: 'A timestamp of when the anomaly was detected.',
              },
              {
                name: 'anomalyScore',
                description: 'The exact severity score of the detected anomaly.',
              },
              {
                name: 'actual',
                description: 'The actual value of the monitored metric at the time of the anomaly.',
              },
              {
                name: 'typical',
                description:
                  'The typical value of the monitored metric at the time of the anomaly.',
              },
              {
                name: 'summary',
                description: 'A description of the anomaly, e.g. 2x higher.',
              },
              {
                name: 'influencers',
                description: 'A list of node names that influenced the anomaly.',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'metrics.alert.anomaly',
          name: 'Infrastructure anomaly',
          producer: 'infrastructure',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'logs.threshold.fired',
              name: 'Fired',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'logs.threshold.fired',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                name: 'timestamp',
                description: 'UTC timestamp of when the alert was triggered',
              },
              {
                name: 'matchingDocuments',
                description: 'The number of log entries that matched the conditions provided',
              },
              {
                name: 'conditions',
                description: 'The conditions that log entries needed to fulfill',
              },
              {
                name: 'group',
                description: 'The name of the group responsible for triggering the alert',
              },
              {
                name: 'isRatio',
                description: 'Denotes whether this alert was configured with a ratio',
              },
              {
                name: 'reason',
                description: 'A concise description of the reason for the alert',
              },
              {
                name: 'ratio',
                description: 'The ratio value of the two sets of criteria',
              },
              {
                name: 'numeratorConditions',
                description: 'The conditions that the numerator of the ratio needed to fulfill',
              },
              {
                name: 'denominatorConditions',
                description: 'The conditions that the denominator of the ratio needed to fulfill',
              },
              {
                name: 'viewInAppUrl',
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'logs.alert.document.count',
          name: 'Log threshold',
          producer: 'logs',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'metrics.inventory_threshold.fired',
              name: 'Alert',
            },
            {
              id: 'metrics.inventory_threshold.warning',
              name: 'Warning',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'metrics.inventory_threshold.fired',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                name: 'group',
                description: 'Name of the group reporting data',
              },
              {
                name: 'alertState',
                description: 'Current state of the alert',
              },
              {
                name: 'reason',
                description: 'A concise description of the reason for the alert',
              },
              {
                name: 'timestamp',
                description: 'A timestamp of when the alert was detected.',
              },
              {
                name: 'value',
                description:
                  'The value of the metric in the specified condition. Usage: (ctx.value.condition0, ctx.value.condition1, etc...).',
              },
              {
                name: 'metric',
                description:
                  'The metric name in the specified condition. Usage: (ctx.metric.condition0, ctx.metric.condition1, etc...).',
              },
              {
                name: 'threshold',
                description:
                  'The threshold value of the metric for the specified condition. Usage: (ctx.threshold.condition0, ctx.threshold.condition1, etc...).',
              },
              {
                name: 'viewInAppUrl',
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'metrics.alert.inventory.threshold',
          name: 'Inventory',
          producer: 'infrastructure',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'metrics.threshold.fired',
              name: 'Alert',
            },
            {
              id: 'metrics.threshold.warning',
              name: 'Warning',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'metrics.threshold.fired',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                name: 'group',
                description: 'Name of the group reporting data',
              },
              {
                name: 'alertState',
                description: 'Current state of the alert',
              },
              {
                name: 'reason',
                description: 'A concise description of the reason for the alert',
              },
              {
                name: 'timestamp',
                description: 'A timestamp of when the alert was detected.',
              },
              {
                name: 'value',
                description:
                  'The value of the metric in the specified condition. Usage: (ctx.value.condition0, ctx.value.condition1, etc...).',
              },
              {
                name: 'metric',
                description:
                  'The metric name in the specified condition. Usage: (ctx.metric.condition0, ctx.metric.condition1, etc...).',
              },
              {
                name: 'threshold',
                description:
                  'The threshold value of the metric for the specified condition. Usage: (ctx.threshold.condition0, ctx.threshold.condition1, etc...).',
              },
              {
                name: 'viewInAppUrl',
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'metrics.alert.threshold',
          name: 'Metric threshold',
          producer: 'infrastructure',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'threshold_met',
              name: 'Threshold met',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'threshold_met',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                description: 'The service the alert is created for',
                name: 'serviceName',
              },
              {
                description: 'The transaction type the alert is created for',
                name: 'transactionType',
              },
              {
                description: 'The transaction type the alert is created for',
                name: 'environment',
              },
              {
                description: 'Any trigger value above this value will cause the alert to fire',
                name: 'threshold',
              },
              {
                description: 'The value that breached the threshold and triggered the alert',
                name: 'triggerValue',
              },
              {
                description:
                  'The length and unit of the time period where the alert conditions were met',
                name: 'interval',
              },
              {
                description: 'A concise description of the reason for the alert',
                name: 'reason',
              },
              {
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
                name: 'viewInAppUrl',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'apm.transaction_duration',
          name: 'Latency threshold',
          producer: 'apm',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'threshold_met',
              name: 'Threshold met',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'threshold_met',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                description: 'The service the alert is created for',
                name: 'serviceName',
              },
              {
                description: 'The transaction type the alert is created for',
                name: 'transactionType',
              },
              {
                description: 'The transaction type the alert is created for',
                name: 'environment',
              },
              {
                description: 'Any trigger value above this value will cause the alert to fire',
                name: 'threshold',
              },
              {
                description: 'The value that breached the threshold and triggered the alert',
                name: 'triggerValue',
              },
              {
                description: 'A concise description of the reason for the alert',
                name: 'reason',
              },
              {
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
                name: 'viewInAppUrl',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'apm.anomaly',
          name: 'Anomaly',
          producer: 'apm',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'threshold_met',
              name: 'Threshold met',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'threshold_met',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                description: 'The service the alert is created for',
                name: 'serviceName',
              },
              {
                description: 'The transaction type the alert is created for',
                name: 'environment',
              },
              {
                description: 'Any trigger value above this value will cause the alert to fire',
                name: 'threshold',
              },
              {
                description: 'The value that breached the threshold and triggered the alert',
                name: 'triggerValue',
              },
              {
                description:
                  'The length and unit of the time period where the alert conditions were met',
                name: 'interval',
              },
              {
                description: 'A concise description of the reason for the alert',
                name: 'reason',
              },
              {
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
                name: 'viewInAppUrl',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'apm.error_rate',
          name: 'Error count threshold',
          producer: 'apm',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'threshold_met',
              name: 'Threshold met',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'threshold_met',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                description: 'The transaction type the alert is created for',
                name: 'transactionType',
              },
              {
                description: 'The service the alert is created for',
                name: 'serviceName',
              },
              {
                description: 'The transaction type the alert is created for',
                name: 'environment',
              },
              {
                description: 'Any trigger value above this value will cause the alert to fire',
                name: 'threshold',
              },
              {
                description: 'The value that breached the threshold and triggered the alert',
                name: 'triggerValue',
              },
              {
                description:
                  'The length and unit of the time period where the alert conditions were met',
                name: 'interval',
              },
              {
                description: 'A concise description of the reason for the alert',
                name: 'reason',
              },
              {
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
                name: 'viewInAppUrl',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'apm.transaction_error_rate',
          name: 'Failed transaction rate threshold',
          producer: 'apm',
          is_exportable: true,
        },
      ],
    });
    useFetchRules.mockReturnValue({ rulesState, noData: true });
    wrapper = mountWithIntl(<RulesPage />);
  }
  it('renders empty screen', async () => {
    await setup();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find(RulesTable)).toHaveLength(0);
    expect(wrapper.find('[data-test-subj="createFirstRuleEmptyPrompt"]').exists()).toBeTruthy();
  });
  it('renders Create rule button', async () => {
    await setup();
    expect(wrapper.find('EuiButton[data-test-subj="createFirstRuleButton"]')).toHaveLength(1);
  });
  it('renders Documentation link', async () => {
    await setup();
    expect(wrapper.find('EuiLink[data-test-subj="documentationLink"]')).toHaveLength(1);
    expect(
      wrapper.find('EuiLink[data-test-subj="documentationLink"]').getElement().props.href
    ).toContain('create-and-manage-rules.html');
  });
});

describe('empty RulesPage with show only capability', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
    const rulesState = {
      isLoading: false,
      data: [],
      error: null,
      totalItemCount: 0,
    };
    const ruleTypes = [
      {
        id: 'test_rule_type',
        name: 'some rule type',
        actionGroups: [{ id: 'default', name: 'Default' }],
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        actionVariables: { context: [], state: [] },
        defaultActionGroupId: 'default',
        producer: ALERTS_FEATURE_ID,
        minimumLicenseRequired: 'basic',
        enabledInLicense: true,
        authorizedConsumers: {
          [ALERTS_FEATURE_ID]: { read: true, all: false },
        },
        ruleTaskTimeout: '1m',
      },
    ];
    useFetchRules.mockReturnValue({ rulesState, noData: true });
    useLoadRuleTypes.mockReturnValue({ ruleTypes });

    wrapper = mountWithIntl(<RulesPage />);
  }

  it('renders no permission screen', async () => {
    await setup();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="noPermissionPrompt"]').exists()).toBeTruthy();
  });

  it('does not render no data screen', async () => {
    await setup();

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="createFirstRuleEmptyPrompt"]').exists()).toBeFalsy();
  });
});

describe('RulesPage with items', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
    const mockedRulesData = [
      {
        id: '1',
        name: 'test rule',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '1s' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'active',
          lastDuration: 500,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [
              {
                success: true,
                duration: 1000000,
              },
              {
                success: true,
                duration: 200000,
              },
              {
                success: false,
                duration: 300000,
              },
            ],
            calculated_metrics: {
              success_ratio: 0.66,
              p50: 200000,
              p95: 300000,
              p99: 300000,
            },
          },
        },
      },
      {
        id: '2',
        name: 'test rule ok',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '5d' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'ok',
          lastDuration: 61000,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [
              {
                success: true,
                duration: 100000,
              },
              {
                success: true,
                duration: 500000,
              },
            ],
            calculated_metrics: {
              success_ratio: 1,
              p50: 0,
              p95: 100000,
              p99: 500000,
            },
          },
        },
      },
      {
        id: '3',
        name: 'test rule pending',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '5d' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'pending',
          lastDuration: 30234,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [{ success: false, duration: 100 }],
            calculated_metrics: {
              success_ratio: 0,
            },
          },
        },
      },
    ];

    const rulesState = {
      isLoading: false,
      data: mockedRulesData,
      error: null,
      totalItemCount: 3,
    };

    const mockedRuleTypeIndex = new Map(
      Object.entries({
        '1': {
          enabledInLicense: true,
          id: '1',
          name: 'test rule',
        },
        '2': {
          enabledInLicense: true,
          id: '2',
          name: 'test rule ok',
        },
        '3': {
          enabledInLicense: true,
          id: '3',
          name: 'test rule pending',
        },
      })
    );

    useLoadRuleTypes.mockReturnValue({
      ruleTypes: [
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'xpack.uptime.alerts.actionGroups.monitorStatus',
              name: 'Uptime Down Monitor',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'xpack.uptime.alerts.actionGroups.monitorStatus',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                name: 'message',
                description: 'A generated message summarizing the currently down monitors',
              },
              {
                name: 'downMonitorsWithGeo',
                description:
                  'A generated summary that shows some or all of the monitors detected as down by the alert',
              },
              {
                name: 'reason',
                description: 'A concise description of the reason for the alert',
              },
              {
                name: 'viewInAppUrl',
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
              },
            ],
            state: [
              {
                name: 'monitorName',
                description:
                  'A human friendly rendering of name or ID, preferring name (e.g. My Monitor)',
              },
              {
                name: 'monitorId',
                description: 'ID of the monitor.',
              },
              {
                name: 'monitorUrl',
                description: 'URL of the monitor.',
              },
              {
                name: 'monitorType',
                description: 'Type (e.g. HTTP/TCP) of the monitor.',
              },
              {
                name: 'statusMessage',
                description:
                  'Status message e.g down or is below availability threshold in case of availability check or both.',
              },
              {
                name: 'latestErrorMessage',
                description: 'Monitor latest error message',
              },
              {
                name: 'observerLocation',
                description: 'Observer location from which heartbeat check is performed.',
              },
              {
                name: 'observerHostname',
                description: 'Observer hostname from which heartbeat check is performed.',
              },
              {
                name: 'firstCheckedAt',
                description: 'Timestamp indicating when this alert first checked',
              },
              {
                name: 'firstTriggeredAt',
                description: 'Timestamp indicating when the alert first triggered',
              },
              {
                name: 'currentTriggerStarted',
                description:
                  'Timestamp indicating when the current trigger state began, if alert is triggered',
              },
              {
                name: 'isTriggered',
                description: 'Flag indicating if the alert is currently triggering',
              },
              {
                name: 'lastCheckedAt',
                description: "Timestamp indicating the alert's most recent check time",
              },
              {
                name: 'lastResolvedAt',
                description: 'Timestamp indicating the most recent resolution time for this alert',
              },
              {
                name: 'lastTriggeredAt',
                description: "Timestamp indicating the alert's most recent trigger time",
              },
            ],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'xpack.uptime.alerts.monitorStatus',
          name: 'Uptime monitor status',
          producer: 'uptime',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'xpack.uptime.alerts.actionGroups.tlsCertificate',
              name: 'Uptime TLS Alert',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'xpack.uptime.alerts.actionGroups.tlsCertificate',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [],
            state: [
              {
                name: 'count',
                description: 'The number of certs detected by the alert executor',
              },
              {
                name: 'expiringCount',
                description: 'The number of expiring certs detected by the alert.',
              },
              {
                name: 'expiringCommonNameAndDate',
                description: 'The common names and expiration date/time of the detected certs',
              },
              {
                name: 'agingCount',
                description: 'The number of detected certs that are becoming too old.',
              },
              {
                name: 'agingCommonNameAndDate',
                description: 'The common names and expiration date/time of the detected certs.',
              },
              {
                name: 'firstCheckedAt',
                description: 'Timestamp indicating when this alert first checked',
              },
              {
                name: 'firstTriggeredAt',
                description: 'Timestamp indicating when the alert first triggered',
              },
              {
                name: 'currentTriggerStarted',
                description:
                  'Timestamp indicating when the current trigger state began, if alert is triggered',
              },
              {
                name: 'isTriggered',
                description: 'Flag indicating if the alert is currently triggering',
              },
              {
                name: 'lastCheckedAt',
                description: "Timestamp indicating the alert's most recent check time",
              },
              {
                name: 'lastResolvedAt',
                description: 'Timestamp indicating the most recent resolution time for this alert',
              },
              {
                name: 'lastTriggeredAt',
                description: "Timestamp indicating the alert's most recent trigger time",
              },
            ],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'xpack.uptime.alerts.tlsCertificate',
          name: 'Uptime TLS',
          producer: 'uptime',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'xpack.uptime.alerts.actionGroups.durationAnomaly',
              name: 'Uptime Duration Anomaly',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'xpack.uptime.alerts.actionGroups.durationAnomaly',
          minimumLicenseRequired: 'platinum',
          actionVariables: {
            context: [
              {
                name: 'reason',
                description: 'A concise description of the reason for the alert',
              },
              {
                name: 'viewInAppUrl',
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
              },
            ],
            state: [
              {
                name: 'severity',
                description: 'The severity of the anomaly.',
              },
              {
                name: 'anomalyStartTimestamp',
                description: 'ISO8601 timestamp of the start of the anomaly.',
              },
              {
                name: 'monitor',
                description:
                  'A human friendly rendering of name or ID, preferring name (e.g. My Monitor)',
              },
              {
                name: 'monitorId',
                description: 'ID of the monitor.',
              },
              {
                name: 'monitorUrl',
                description: 'URL of the monitor.',
              },
              {
                name: 'slowestAnomalyResponse',
                description:
                  'Slowest response time during anomaly bucket with unit (ms, s) attached.',
              },
              {
                name: 'expectedResponseTime',
                description: 'Expected response time',
              },
              {
                name: 'severityScore',
                description: 'Anomaly severity score',
              },
              {
                name: 'observerLocation',
                description: 'Observer location from which heartbeat check is performed.',
              },
              {
                name: 'firstCheckedAt',
                description: 'Timestamp indicating when this alert first checked',
              },
              {
                name: 'firstTriggeredAt',
                description: 'Timestamp indicating when the alert first triggered',
              },
              {
                name: 'currentTriggerStarted',
                description:
                  'Timestamp indicating when the current trigger state began, if alert is triggered',
              },
              {
                name: 'isTriggered',
                description: 'Flag indicating if the alert is currently triggering',
              },
              {
                name: 'lastCheckedAt',
                description: "Timestamp indicating the alert's most recent check time",
              },
              {
                name: 'lastResolvedAt',
                description: 'Timestamp indicating the most recent resolution time for this alert',
              },
              {
                name: 'lastTriggeredAt',
                description: "Timestamp indicating the alert's most recent trigger time",
              },
            ],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'xpack.uptime.alerts.durationAnomaly',
          name: 'Uptime Duration Anomaly',
          producer: 'uptime',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'xpack.uptime.alerts.actionGroups.tls',
              name: 'Uptime TLS Alert (Legacy)',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'xpack.uptime.alerts.actionGroups.tls',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [],
            state: [
              {
                name: 'count',
                description: 'The number of certs detected by the alert executor',
              },
              {
                name: 'expiringCount',
                description: 'The number of expiring certs detected by the alert.',
              },
              {
                name: 'expiringCommonNameAndDate',
                description: 'The common names and expiration date/time of the detected certs',
              },
              {
                name: 'agingCount',
                description: 'The number of detected certs that are becoming too old.',
              },
              {
                name: 'agingCommonNameAndDate',
                description: 'The common names and expiration date/time of the detected certs.',
              },
              {
                name: 'firstCheckedAt',
                description: 'Timestamp indicating when this alert first checked',
              },
              {
                name: 'firstTriggeredAt',
                description: 'Timestamp indicating when the alert first triggered',
              },
              {
                name: 'currentTriggerStarted',
                description:
                  'Timestamp indicating when the current trigger state began, if alert is triggered',
              },
              {
                name: 'isTriggered',
                description: 'Flag indicating if the alert is currently triggering',
              },
              {
                name: 'lastCheckedAt',
                description: "Timestamp indicating the alert's most recent check time",
              },
              {
                name: 'lastResolvedAt',
                description: 'Timestamp indicating the most recent resolution time for this alert',
              },
              {
                name: 'lastTriggeredAt',
                description: "Timestamp indicating the alert's most recent trigger time",
              },
            ],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'xpack.uptime.alerts.tls',
          name: 'Uptime TLS (Legacy)',
          producer: 'uptime',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'metrics.anomaly.fired',
              name: 'Fired',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'metrics.anomaly.fired',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                name: 'alertState',
                description: 'Current state of the alert',
              },
              {
                name: 'metric',
                description: 'The metric name in the specified condition.',
              },
              {
                name: 'timestamp',
                description: 'A timestamp of when the anomaly was detected.',
              },
              {
                name: 'anomalyScore',
                description: 'The exact severity score of the detected anomaly.',
              },
              {
                name: 'actual',
                description: 'The actual value of the monitored metric at the time of the anomaly.',
              },
              {
                name: 'typical',
                description:
                  'The typical value of the monitored metric at the time of the anomaly.',
              },
              {
                name: 'summary',
                description: 'A description of the anomaly, e.g. 2x higher.',
              },
              {
                name: 'influencers',
                description: 'A list of node names that influenced the anomaly.',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'metrics.alert.anomaly',
          name: 'Infrastructure anomaly',
          producer: 'infrastructure',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'logs.threshold.fired',
              name: 'Fired',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'logs.threshold.fired',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                name: 'timestamp',
                description: 'UTC timestamp of when the alert was triggered',
              },
              {
                name: 'matchingDocuments',
                description: 'The number of log entries that matched the conditions provided',
              },
              {
                name: 'conditions',
                description: 'The conditions that log entries needed to fulfill',
              },
              {
                name: 'group',
                description: 'The name of the group responsible for triggering the alert',
              },
              {
                name: 'isRatio',
                description: 'Denotes whether this alert was configured with a ratio',
              },
              {
                name: 'reason',
                description: 'A concise description of the reason for the alert',
              },
              {
                name: 'ratio',
                description: 'The ratio value of the two sets of criteria',
              },
              {
                name: 'numeratorConditions',
                description: 'The conditions that the numerator of the ratio needed to fulfill',
              },
              {
                name: 'denominatorConditions',
                description: 'The conditions that the denominator of the ratio needed to fulfill',
              },
              {
                name: 'viewInAppUrl',
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'logs.alert.document.count',
          name: 'Log threshold',
          producer: 'logs',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'metrics.inventory_threshold.fired',
              name: 'Alert',
            },
            {
              id: 'metrics.inventory_threshold.warning',
              name: 'Warning',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'metrics.inventory_threshold.fired',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                name: 'group',
                description: 'Name of the group reporting data',
              },
              {
                name: 'alertState',
                description: 'Current state of the alert',
              },
              {
                name: 'reason',
                description: 'A concise description of the reason for the alert',
              },
              {
                name: 'timestamp',
                description: 'A timestamp of when the alert was detected.',
              },
              {
                name: 'value',
                description:
                  'The value of the metric in the specified condition. Usage: (ctx.value.condition0, ctx.value.condition1, etc...).',
              },
              {
                name: 'metric',
                description:
                  'The metric name in the specified condition. Usage: (ctx.metric.condition0, ctx.metric.condition1, etc...).',
              },
              {
                name: 'threshold',
                description:
                  'The threshold value of the metric for the specified condition. Usage: (ctx.threshold.condition0, ctx.threshold.condition1, etc...).',
              },
              {
                name: 'viewInAppUrl',
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'metrics.alert.inventory.threshold',
          name: 'Inventory',
          producer: 'infrastructure',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'metrics.threshold.fired',
              name: 'Alert',
            },
            {
              id: 'metrics.threshold.warning',
              name: 'Warning',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'metrics.threshold.fired',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                name: 'group',
                description: 'Name of the group reporting data',
              },
              {
                name: 'alertState',
                description: 'Current state of the alert',
              },
              {
                name: 'reason',
                description: 'A concise description of the reason for the alert',
              },
              {
                name: 'timestamp',
                description: 'A timestamp of when the alert was detected.',
              },
              {
                name: 'value',
                description:
                  'The value of the metric in the specified condition. Usage: (ctx.value.condition0, ctx.value.condition1, etc...).',
              },
              {
                name: 'metric',
                description:
                  'The metric name in the specified condition. Usage: (ctx.metric.condition0, ctx.metric.condition1, etc...).',
              },
              {
                name: 'threshold',
                description:
                  'The threshold value of the metric for the specified condition. Usage: (ctx.threshold.condition0, ctx.threshold.condition1, etc...).',
              },
              {
                name: 'viewInAppUrl',
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'metrics.alert.threshold',
          name: 'Metric threshold',
          producer: 'infrastructure',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'threshold_met',
              name: 'Threshold met',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'threshold_met',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                description: 'The service the alert is created for',
                name: 'serviceName',
              },
              {
                description: 'The transaction type the alert is created for',
                name: 'transactionType',
              },
              {
                description: 'The transaction type the alert is created for',
                name: 'environment',
              },
              {
                description: 'Any trigger value above this value will cause the alert to fire',
                name: 'threshold',
              },
              {
                description: 'The value that breached the threshold and triggered the alert',
                name: 'triggerValue',
              },
              {
                description:
                  'The length and unit of the time period where the alert conditions were met',
                name: 'interval',
              },
              {
                description: 'A concise description of the reason for the alert',
                name: 'reason',
              },
              {
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
                name: 'viewInAppUrl',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'apm.transaction_duration',
          name: 'Latency threshold',
          producer: 'apm',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'threshold_met',
              name: 'Threshold met',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'threshold_met',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                description: 'The service the alert is created for',
                name: 'serviceName',
              },
              {
                description: 'The transaction type the alert is created for',
                name: 'transactionType',
              },
              {
                description: 'The transaction type the alert is created for',
                name: 'environment',
              },
              {
                description: 'Any trigger value above this value will cause the alert to fire',
                name: 'threshold',
              },
              {
                description: 'The value that breached the threshold and triggered the alert',
                name: 'triggerValue',
              },
              {
                description: 'A concise description of the reason for the alert',
                name: 'reason',
              },
              {
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
                name: 'viewInAppUrl',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'apm.anomaly',
          name: 'Anomaly',
          producer: 'apm',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'threshold_met',
              name: 'Threshold met',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'threshold_met',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                description: 'The service the alert is created for',
                name: 'serviceName',
              },
              {
                description: 'The transaction type the alert is created for',
                name: 'environment',
              },
              {
                description: 'Any trigger value above this value will cause the alert to fire',
                name: 'threshold',
              },
              {
                description: 'The value that breached the threshold and triggered the alert',
                name: 'triggerValue',
              },
              {
                description:
                  'The length and unit of the time period where the alert conditions were met',
                name: 'interval',
              },
              {
                description: 'A concise description of the reason for the alert',
                name: 'reason',
              },
              {
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
                name: 'viewInAppUrl',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'apm.error_rate',
          name: 'Error count threshold',
          producer: 'apm',
          is_exportable: true,
        },
        {
          enabledInLicense: true,
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          actionGroups: [
            {
              id: 'threshold_met',
              name: 'Threshold met',
            },
            {
              id: 'recovered',
              name: 'Recovered',
            },
          ],
          defaultActionGroupId: 'threshold_met',
          minimumLicenseRequired: 'basic',
          actionVariables: {
            context: [
              {
                description: 'The transaction type the alert is created for',
                name: 'transactionType',
              },
              {
                description: 'The service the alert is created for',
                name: 'serviceName',
              },
              {
                description: 'The transaction type the alert is created for',
                name: 'environment',
              },
              {
                description: 'Any trigger value above this value will cause the alert to fire',
                name: 'threshold',
              },
              {
                description: 'The value that breached the threshold and triggered the alert',
                name: 'triggerValue',
              },
              {
                description:
                  'The length and unit of the time period where the alert conditions were met',
                name: 'interval',
              },
              {
                description: 'A concise description of the reason for the alert',
                name: 'reason',
              },
              {
                description:
                  'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
                name: 'viewInAppUrl',
              },
            ],
            state: [],
            params: [],
          },
          authorizedConsumers: {
            alerts: {
              read: true,
              all: true,
            },
            stackAlerts: {
              read: true,
              all: true,
            },
            ml: {
              read: true,
              all: true,
            },
            siem: {
              read: true,
              all: true,
            },
            uptime: {
              read: true,
              all: true,
            },
            infrastructure: {
              read: true,
              all: true,
            },
            logs: {
              read: true,
              all: true,
            },
            monitoring: {
              read: true,
              all: true,
            },
            apm: {
              read: true,
              all: true,
            },
            discover: {
              read: true,
              all: true,
            },
          },
          ruleTaskTimeout: '5m',
          doesSetRecoveryContext: false,
          id: 'apm.transaction_error_rate',
          name: 'Failed transaction rate threshold',
          producer: 'apm',
          is_exportable: true,
        },
      ],
      ruleTypeIndex: mockedRuleTypeIndex,
    });
    useFetchRules.mockReturnValue({ rulesState });
    wrapper = mountWithIntl(<RulesPage />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
  }

  it('renders table of rules', async () => {
    await setup();
    expect(wrapper.find(RulesTable)).toHaveLength(1);
  });
});

describe('RulesPage with items and show only capability', () => {
  let wrapper: ReactWrapper<any>;
  async function setup() {
    const mockedRulesData = [
      {
        id: '1',
        name: 'test rule',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '1s' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'active',
          lastDuration: 500,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [
              {
                success: true,
                duration: 1000000,
              },
              {
                success: true,
                duration: 200000,
              },
              {
                success: false,
                duration: 300000,
              },
            ],
            calculated_metrics: {
              success_ratio: 0.66,
              p50: 200000,
              p95: 300000,
              p99: 300000,
            },
          },
        },
      },
      {
        id: '2',
        name: 'test rule ok',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '5d' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'ok',
          lastDuration: 61000,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [
              {
                success: true,
                duration: 100000,
              },
              {
                success: true,
                duration: 500000,
              },
            ],
            calculated_metrics: {
              success_ratio: 1,
              p50: 0,
              p95: 100000,
              p99: 500000,
            },
          },
        },
      },
      {
        id: '3',
        name: 'test rule pending',
        tags: ['tag1'],
        enabled: true,
        ruleTypeId: 'test_rule_type',
        schedule: { interval: '5d' },
        actions: [],
        params: { name: 'test rule type name' },
        scheduledTaskId: null,
        createdBy: null,
        updatedBy: null,
        apiKeyOwner: null,
        throttle: '1m',
        muteAll: false,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'pending',
          lastDuration: 30234,
          lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
          error: null,
        },
        monitoring: {
          execution: {
            history: [{ success: false, duration: 100 }],
            calculated_metrics: {
              success_ratio: 0,
            },
          },
        },
      },
    ];
    const rulesState = {
      isLoading: false,
      data: mockedRulesData,
      error: null,
      totalItemCount: 3,
    };
    useFetchRules.mockReturnValue({ rulesState });

    const mockedRuleTypeIndex = new Map(
      Object.entries({
        '1': {
          enabledInLicense: true,
          id: '1',
          name: 'test rule',
        },
        '2': {
          enabledInLicense: true,
          id: '2',
          name: 'test rule ok',
        },
        '3': {
          enabledInLicense: true,
          id: '3',
          name: 'test rule pending',
        },
      })
    );
    const ruleTypes = [
      {
        id: 'test_rule_type',
        name: 'some rule type',
        actionGroups: [{ id: 'default', name: 'Default' }],
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        actionVariables: { context: [], state: [] },
        defaultActionGroupId: 'default',
        producer: ALERTS_FEATURE_ID,
        minimumLicenseRequired: 'basic',
        enabledInLicense: true,
        authorizedConsumers: {
          [ALERTS_FEATURE_ID]: { read: true, all: false },
        },
        ruleTaskTimeout: '1m',
      },
    ];
    useLoadRuleTypes.mockReturnValue({ ruleTypes, ruleTypeIndex: mockedRuleTypeIndex });

    wrapper = mountWithIntl(<RulesPage />);
  }

  it('does not render create rule button', async () => {
    await setup();
    expect(wrapper.find('[data-test-subj="createRuleButton"]')).toHaveLength(0);
  });
});
