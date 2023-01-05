/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_DURATION,
  ALERT_EVALUATION_VALUE,
  ALERT_INSTANCE_ID,
  ALERT_RULE_NAME,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  SPACE_IDS,
  TIMESTAMP,
  VERSION,
} from '@kbn/rule-data-utils';
import { TopAlert } from '../pages/alerts';
import { ConfigSchema } from '../plugin';
import { isAlertDetailsEnabledPerApp } from './is_alert_details_enabled';
const defaultConfig = {
  unsafe: {
    alertDetails: {
      apm: { enabled: false },
      logs: { enabled: false },
      metrics: { enabled: false },
      uptime: { enabled: false },
    },
  },
} as ConfigSchema;
describe('isAlertDetailsEnabled', () => {
  describe('Logs alert', () => {
    const logsAlert = {
      reason: 'reason message',
      fields: {
        [ALERT_STATUS]: 'active',
        [TIMESTAMP]: '2022-09-02T13:08:51.750Z',
        [ALERT_DURATION]: 882076000,
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_RULE_UUID]: 'db2ab7c0-0bec-11ec-9ae2-5b10ca924404',
        [ALERT_START]: '2021-09-02T12:54:09.674Z',
        [ALERT_RULE_TYPE_ID]: 'logs.alert.document.count',
        [EVENT_ACTION]: 'active',
        [ALERT_EVALUATION_VALUE]: 1957,
        [ALERT_INSTANCE_ID]: '*',
        [ALERT_RULE_NAME]: 'mockedRule',
        [ALERT_UUID]: '432ab7c0-0bec-11ec-9ae2-4b10ca857438',
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.0.0',
        [EVENT_KIND]: 'signal',
        [ALERT_RULE_TAGS]: [],
      },
      active: true,
      start: 1630587249674,
      lastUpdated: 1630588131750,
    } as unknown as TopAlert;
    it('returns FALSE when logs: { enabled: false }', () => {
      expect(isAlertDetailsEnabledPerApp(logsAlert, defaultConfig)).toBeFalsy();
    });

    it('returns TRUE when logs: { enabled: true }', () => {
      const updatedConfig = {
        unsafe: {
          alertDetails: {
            apm: { enabled: false },
            logs: { enabled: true },
            metrics: { enabled: false },
            uptime: { enabled: false },
          },
        },
      } as ConfigSchema;
      expect(isAlertDetailsEnabledPerApp(logsAlert, updatedConfig)).toBeTruthy();
    });
  });
  describe('APM alert', () => {
    const APMAlert = {
      reason: 'reason message',
      fields: {
        [ALERT_STATUS]: 'active',
        [TIMESTAMP]: '2022-09-02T13:08:51.750Z',
        [ALERT_DURATION]: 882076000,
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_RULE_UUID]: 'db2ab7c0-0bec-11ec-9ae2-5b10ca924404',
        [ALERT_START]: '2021-09-02T12:54:09.674Z',
        [ALERT_RULE_TYPE_ID]: 'apm.transaction_error_rate',
        [EVENT_ACTION]: 'active',
        [ALERT_EVALUATION_VALUE]: 1957,
        [ALERT_INSTANCE_ID]: '*',
        [ALERT_RULE_NAME]: 'mockedRule',
        [ALERT_UUID]: '432ab7c0-0bec-11ec-9ae2-4b10ca857438',
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.0.0',
        [EVENT_KIND]: 'signal',
        [ALERT_RULE_TAGS]: [],
      },
      active: true,
      start: 1630587249674,
      lastUpdated: 1630588131750,
    } as unknown as TopAlert;
    it('returns FALSE when apm: { enabled: false }', () => {
      expect(isAlertDetailsEnabledPerApp(APMAlert, defaultConfig)).toBeFalsy();
    });

    it('returns TRUE when apm: { enabled: true }', () => {
      const updatedConfig = {
        unsafe: {
          alertDetails: {
            apm: { enabled: true },
            logs: { enabled: false },
            metrics: { enabled: false },
            uptime: { enabled: false },
          },
        },
      } as ConfigSchema;
      expect(isAlertDetailsEnabledPerApp(APMAlert, updatedConfig)).toBeTruthy();
    });
  });
  describe('Metrics alert', () => {
    const metricsAlert = {
      reason: 'reason message',
      fields: {
        [ALERT_STATUS]: 'active',
        [TIMESTAMP]: '2022-09-02T13:08:51.750Z',
        [ALERT_DURATION]: 882076000,
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_RULE_UUID]: 'db2ab7c0-0bec-11ec-9ae2-5b10ca924404',
        [ALERT_START]: '2021-09-02T12:54:09.674Z',
        [ALERT_RULE_TYPE_ID]: 'metrics.alert.inventory.threshold',
        [EVENT_ACTION]: 'active',
        [ALERT_EVALUATION_VALUE]: 1957,
        [ALERT_INSTANCE_ID]: '*',
        [ALERT_RULE_NAME]: 'mockedRule',
        [ALERT_UUID]: '432ab7c0-0bec-11ec-9ae2-4b10ca857438',
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.0.0',
        [EVENT_KIND]: 'signal',
        [ALERT_RULE_TAGS]: [],
      },
      active: true,
      start: 1630587249674,
      lastUpdated: 1630588131750,
    } as unknown as TopAlert;
    it('returns FALSE when metrics: { enabled: false }', () => {
      expect(isAlertDetailsEnabledPerApp(metricsAlert, defaultConfig)).toBeFalsy();
    });

    it('returns TRUE when metrics: { enabled: true }', () => {
      const updatedConfig = {
        unsafe: {
          alertDetails: {
            apm: { enabled: false },
            logs: { enabled: false },
            metrics: { enabled: true },
            uptime: { enabled: false },
          },
        },
      } as ConfigSchema;
      expect(isAlertDetailsEnabledPerApp(metricsAlert, updatedConfig)).toBeTruthy();
    });
  });
  describe('Uptime alert', () => {
    const uptimeAlert = {
      reason: 'reason message',
      fields: {
        [ALERT_STATUS]: 'active',
        [TIMESTAMP]: '2022-09-02T13:08:51.750Z',
        [ALERT_DURATION]: 882076000,
        [ALERT_WORKFLOW_STATUS]: 'open',
        [ALERT_RULE_UUID]: 'db2ab7c0-0bec-11ec-9ae2-5b10ca924404',
        [ALERT_START]: '2021-09-02T12:54:09.674Z',
        [ALERT_RULE_TYPE_ID]: 'xpack.uptime.alerts.monitorStatus',
        [EVENT_ACTION]: 'active',
        [ALERT_EVALUATION_VALUE]: 1957,
        [ALERT_INSTANCE_ID]: '*',
        [ALERT_RULE_NAME]: 'mockedRule',
        [ALERT_UUID]: '432ab7c0-0bec-11ec-9ae2-4b10ca857438',
        [SPACE_IDS]: ['default'],
        [VERSION]: '8.0.0',
        [EVENT_KIND]: 'signal',
        [ALERT_RULE_TAGS]: [],
      },
      active: true,
      start: 1630587249674,
      lastUpdated: 1630588131750,
    } as unknown as TopAlert;
    it('returns FALSE when uptime: { enabled: false }', () => {
      expect(isAlertDetailsEnabledPerApp(uptimeAlert, defaultConfig)).toBeFalsy();
    });

    it('returns TRUE when uptime: { enabled: true }', () => {
      const updatedConfig = {
        unsafe: {
          alertDetails: {
            apm: { enabled: false },
            logs: { enabled: false },
            metrics: { enabled: false },
            uptime: { enabled: true },
          },
        },
      } as ConfigSchema;
      expect(isAlertDetailsEnabledPerApp(uptimeAlert, updatedConfig)).toBeTruthy();
    });
  });
  describe('Edge cases', () => {
    it('returns FALSE when no config provided', () => {
      const uptimeAlert = {
        reason: 'reason message',
        fields: {
          [ALERT_STATUS]: 'active',
          [TIMESTAMP]: '2022-09-02T13:08:51.750Z',
          [ALERT_DURATION]: 882076000,
          [ALERT_WORKFLOW_STATUS]: 'open',
          [ALERT_RULE_UUID]: 'db2ab7c0-0bec-11ec-9ae2-5b10ca924404',
          [ALERT_START]: '2021-09-02T12:54:09.674Z',
          [ALERT_RULE_TYPE_ID]: 'xpack.uptime.alerts.monitorStatus',
          [EVENT_ACTION]: 'active',
          [ALERT_EVALUATION_VALUE]: 1957,
          [ALERT_INSTANCE_ID]: '*',
          [ALERT_RULE_NAME]: 'mockedRule',
          [ALERT_UUID]: '432ab7c0-0bec-11ec-9ae2-4b10ca857438',
          [SPACE_IDS]: ['default'],
          [VERSION]: '8.0.0',
          [EVENT_KIND]: 'signal',
          [ALERT_RULE_TAGS]: [],
        },
        active: true,
        start: 1630587249674,
        lastUpdated: 1630588131750,
      } as unknown as TopAlert;
      expect(isAlertDetailsEnabledPerApp(uptimeAlert, null)).toBeFalsy();
    });

    it('returns FALSE when no alert provided', () => {
      const updatedConfig = {
        unsafe: {
          alertDetails: {
            apm: { enabled: true },
            logs: { enabled: true },
            metrics: { enabled: true },
            uptime: { enabled: true },
          },
        },
      } as ConfigSchema;
      expect(isAlertDetailsEnabledPerApp(null, updatedConfig)).toBeFalsy();
    });
    it('returns FALSE when a none-listed rule type is checked', () => {
      const updatedConfig = {
        unsafe: {
          alertDetails: {
            apm: { enabled: true },
            logs: { enabled: true },
            metrics: { enabled: true },
            uptime: { enabled: true },
          },
        },
      } as ConfigSchema;
      const noneListedRuleType = {
        reason: 'reason message',
        fields: {
          [ALERT_STATUS]: 'active',
          [TIMESTAMP]: '2022-09-02T13:08:51.750Z',
          [ALERT_DURATION]: 882076000,
          [ALERT_WORKFLOW_STATUS]: 'open',
          [ALERT_RULE_UUID]: 'db2ab7c0-0bec-11ec-9ae2-5b10ca924404',
          [ALERT_START]: '2021-09-02T12:54:09.674Z',
          [ALERT_RULE_TYPE_ID]: 'new.rule.type.not.listed',
          [EVENT_ACTION]: 'active',
          [ALERT_EVALUATION_VALUE]: 1957,
          [ALERT_INSTANCE_ID]: '*',
          [ALERT_RULE_NAME]: 'mockedRule',
          [ALERT_UUID]: '432ab7c0-0bec-11ec-9ae2-4b10ca857438',
          [SPACE_IDS]: ['default'],
          [VERSION]: '8.0.0',
          [EVENT_KIND]: 'signal',
          [ALERT_RULE_TAGS]: [],
        },
        active: true,
        start: 1630587249674,
        lastUpdated: 1630588131750,
      } as unknown as TopAlert;
      expect(isAlertDetailsEnabledPerApp(noneListedRuleType, updatedConfig)).toBeFalsy();
    });
  });
});
