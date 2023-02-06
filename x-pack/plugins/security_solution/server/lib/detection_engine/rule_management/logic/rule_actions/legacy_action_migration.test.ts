/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requestContextMock } from '../../../routes/__mocks__';
import {
  getEmptyFindResult,
  legacyGetDailyNotificationResult,
  legacyGetHourlyNotificationResult,
  legacyGetSiemNotificationRuleActionsSOResultWithSingleHit,
  legacyGetWeeklyNotificationResult,
} from '../../../routes/__mocks__/request_responses';

import type { RuleAlertType } from '../../../rule_schema';

// eslint-disable-next-line no-restricted-imports
import { legacyMigrate, getUpdatedActionsParams } from './legacy_action_migration';

const getRuleLegacyActions = (): RuleAlertType =>
  ({
    id: '123',
    notifyWhen: 'onThrottleInterval',
    name: 'Simple Rule Query',
    tags: ['__internal_rule_id:ruleId', '__internal_immutable:false'],
    alertTypeId: 'siem.queryRule',
    consumer: 'siem',
    enabled: true,
    throttle: '1h',
    apiKeyOwner: 'elastic',
    createdBy: 'elastic',
    updatedBy: 'elastic',
    muteAll: false,
    mutedInstanceIds: [],
    monitoring: { execution: { history: [], calculated_metrics: { success_ratio: 0 } } },
    mapped_params: { risk_score: 1, severity: '60-high' },
    schedule: { interval: '5m' },
    actions: [],
    params: {
      author: [],
      description: 'Simple Rule Query',
      ruleId: 'ruleId',
      falsePositives: [],
      from: 'now-6m',
      immutable: false,
      outputIndex: '.siem-signals-default',
      maxSignals: 100,
      riskScore: 1,
      riskScoreMapping: [],
      severity: 'high',
      severityMapping: [],
      threat: [],
      to: 'now',
      references: [],
      version: 1,
      exceptionsList: [],
      type: 'query',
      language: 'kuery',
      index: ['auditbeat-*'],
      query: 'user.name: root or user.name: admin',
    },
    snoozeEndTime: null,
    updatedAt: '2022-03-31T21:47:25.695Z',
    createdAt: '2022-03-31T21:47:16.379Z',
    scheduledTaskId: '21bb9b60-b13c-11ec-99d0-asdfasdfasf',
    executionStatus: {
      status: 'pending',
      lastExecutionDate: '2022-03-31T21:47:25.695Z',
      lastDuration: 0,
    },
  } as unknown as RuleAlertType);

describe('Legacy rule action migration logic', () => {
  describe('legacyMigrate', () => {
    const ruleId = '123';
    const connectorId = '456';
    const { clients } = requestContextMock.createTools();

    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('it does no cleanup or migration if no legacy reminants found', async () => {
      clients.rulesClient.find.mockResolvedValueOnce(getEmptyFindResult());
      clients.savedObjectsClient.find.mockResolvedValueOnce({
        page: 0,
        per_page: 0,
        total: 0,
        saved_objects: [],
      });

      const rule = {
        ...getRuleLegacyActions(),
        id: ruleId,
        actions: [],
        throttle: null,
        notifyWhen: 'onActiveAlert',
        muteAll: true,
      } as RuleAlertType;

      const migratedRule = await legacyMigrate({
        rulesClient: clients.rulesClient,
        savedObjectsClient: clients.savedObjectsClient,
        rule,
      });

      expect(clients.rulesClient.delete).not.toHaveBeenCalled();
      expect(clients.savedObjectsClient.delete).not.toHaveBeenCalled();
      expect(migratedRule).toEqual(rule);
    });

    // Even if a rule is created with no actions pre 7.16, a
    // siem-detection-engine-rule-actions SO is still created
    test('it migrates a rule with no actions', async () => {
      // siem.notifications is not created for a rule with no actions
      clients.rulesClient.find.mockResolvedValueOnce(getEmptyFindResult());
      // siem-detection-engine-rule-actions SO is still created
      clients.savedObjectsClient.find.mockResolvedValueOnce(
        legacyGetSiemNotificationRuleActionsSOResultWithSingleHit(['none'], ruleId, connectorId)
      );

      const migratedRule = await legacyMigrate({
        rulesClient: clients.rulesClient,
        savedObjectsClient: clients.savedObjectsClient,
        rule: {
          ...getRuleLegacyActions(),
          id: ruleId,
          actions: [],
          throttle: null,
          notifyWhen: 'onActiveAlert',
          muteAll: true,
        },
      });

      expect(clients.rulesClient.delete).not.toHaveBeenCalled();
      expect(clients.savedObjectsClient.delete).toHaveBeenCalledWith(
        'siem-detection-engine-rule-actions',
        'ID_OF_LEGACY_SIDECAR_NO_ACTIONS'
      );
      expect(migratedRule?.actions).toEqual([]);
      expect(migratedRule?.throttle).toBeNull();
      expect(migratedRule?.muteAll).toBeTruthy();
      expect(migratedRule?.notifyWhen).toEqual('onActiveAlert');
    });

    test('it migrates a rule with every rule run action', async () => {
      // siem.notifications is not created for a rule with actions run every rule run
      clients.rulesClient.find.mockResolvedValueOnce(getEmptyFindResult());
      // siem-detection-engine-rule-actions SO is still created
      clients.savedObjectsClient.find.mockResolvedValueOnce(
        legacyGetSiemNotificationRuleActionsSOResultWithSingleHit(['rule'], ruleId, connectorId)
      );

      const migratedRule = await legacyMigrate({
        rulesClient: clients.rulesClient,
        savedObjectsClient: clients.savedObjectsClient,
        rule: {
          ...getRuleLegacyActions(),
          id: ruleId,
          actions: [
            {
              actionTypeId: '.email',
              params: {
                subject: 'Test Actions',
                to: ['test@test.com'],
                message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              },
              id: connectorId,
              group: 'default',
            },
          ],
          throttle: null,
          notifyWhen: 'onActiveAlert',
          muteAll: false,
        },
      });

      expect(clients.rulesClient.delete).not.toHaveBeenCalled();
      expect(clients.savedObjectsClient.delete).toHaveBeenCalledWith(
        'siem-detection-engine-rule-actions',
        'ID_OF_LEGACY_SIDECAR_RULE_RUN_ACTIONS'
      );
      expect(migratedRule?.actions).toEqual([
        {
          id: connectorId,
          actionTypeId: '.email',
          group: 'default',
          params: {
            message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            subject: 'Test Actions',
            to: ['test@test.com'],
          },
        },
      ]);
      expect(migratedRule?.notifyWhen).toEqual('onActiveAlert');
      expect(migratedRule?.throttle).toBeNull();
      expect(migratedRule?.muteAll).toBeFalsy();
    });

    test('it migrates a rule with daily legacy actions', async () => {
      // siem.notifications is not created for a rule with no actions
      clients.rulesClient.find.mockResolvedValueOnce({
        page: 1,
        perPage: 1,
        total: 1,
        data: [legacyGetDailyNotificationResult(connectorId, ruleId)],
      });
      // siem-detection-engine-rule-actions SO is still created
      clients.savedObjectsClient.find.mockResolvedValueOnce(
        legacyGetSiemNotificationRuleActionsSOResultWithSingleHit(['daily'], ruleId, connectorId)
      );

      const migratedRule = await legacyMigrate({
        rulesClient: clients.rulesClient,
        savedObjectsClient: clients.savedObjectsClient,
        rule: {
          ...getRuleLegacyActions(),
          id: ruleId,
          actions: [],
          throttle: null,
          notifyWhen: 'onActiveAlert',
        },
      });

      expect(clients.rulesClient.delete).toHaveBeenCalledWith({ id: '456' });
      expect(clients.savedObjectsClient.delete).toHaveBeenCalledWith(
        'siem-detection-engine-rule-actions',
        'ID_OF_LEGACY_SIDECAR_DAILY_ACTIONS'
      );
      expect(migratedRule?.actions).toEqual([
        {
          actionTypeId: '.email',
          group: 'default',
          id: connectorId,
          params: {
            message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            to: ['test@test.com'],
            subject: 'Test Actions',
          },
        },
      ]);
      expect(migratedRule?.throttle).toEqual('1d');
      expect(migratedRule?.notifyWhen).toEqual('onThrottleInterval');
      expect(migratedRule?.muteAll).toBeFalsy();
    });

    test('it migrates a rule with hourly legacy actions', async () => {
      // siem.notifications is not created for a rule with no actions
      clients.rulesClient.find.mockResolvedValueOnce({
        page: 1,
        perPage: 1,
        total: 1,
        data: [legacyGetHourlyNotificationResult(connectorId, ruleId)],
      });
      // siem-detection-engine-rule-actions SO is still created
      clients.savedObjectsClient.find.mockResolvedValueOnce(
        legacyGetSiemNotificationRuleActionsSOResultWithSingleHit(['hourly'], ruleId, connectorId)
      );

      const migratedRule = await legacyMigrate({
        rulesClient: clients.rulesClient,
        savedObjectsClient: clients.savedObjectsClient,
        rule: {
          ...getRuleLegacyActions(),
          id: ruleId,
          actions: [],
          throttle: null,
          notifyWhen: 'onActiveAlert',
        },
      });

      expect(clients.rulesClient.delete).toHaveBeenCalledWith({ id: '456' });
      expect(clients.savedObjectsClient.delete).toHaveBeenCalledWith(
        'siem-detection-engine-rule-actions',
        'ID_OF_LEGACY_SIDECAR_HOURLY_ACTIONS'
      );
      expect(migratedRule?.actions).toEqual([
        {
          actionTypeId: '.email',
          group: 'default',
          id: connectorId,
          params: {
            message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            to: ['test@test.com'],
            subject: 'Test Actions',
          },
        },
      ]);
      expect(migratedRule?.throttle).toEqual('1h');
      expect(migratedRule?.notifyWhen).toEqual('onThrottleInterval');
      expect(migratedRule?.muteAll).toBeFalsy();
    });

    test('it migrates a rule with weekly legacy actions', async () => {
      // siem.notifications is not created for a rule with no actions
      clients.rulesClient.find.mockResolvedValueOnce({
        page: 1,
        perPage: 1,
        total: 1,
        data: [legacyGetWeeklyNotificationResult(connectorId, ruleId)],
      });
      // siem-detection-engine-rule-actions SO is still created
      clients.savedObjectsClient.find.mockResolvedValueOnce(
        legacyGetSiemNotificationRuleActionsSOResultWithSingleHit(['weekly'], ruleId, connectorId)
      );

      const migratedRule = await legacyMigrate({
        rulesClient: clients.rulesClient,
        savedObjectsClient: clients.savedObjectsClient,
        rule: {
          ...getRuleLegacyActions(),
          id: ruleId,
          actions: [],
          throttle: null,
          notifyWhen: 'onActiveAlert',
        },
      });

      expect(clients.rulesClient.delete).toHaveBeenCalledWith({ id: '456' });
      expect(clients.savedObjectsClient.delete).toHaveBeenCalledWith(
        'siem-detection-engine-rule-actions',
        'ID_OF_LEGACY_SIDECAR_WEEKLY_ACTIONS'
      );
      expect(migratedRule?.actions).toEqual([
        {
          actionTypeId: '.email',
          group: 'default',
          id: connectorId,
          params: {
            message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            to: ['test@test.com'],
            subject: 'Test Actions',
          },
        },
      ]);
      expect(migratedRule?.throttle).toEqual('7d');
      expect(migratedRule?.notifyWhen).toEqual('onThrottleInterval');
      expect(migratedRule?.muteAll).toBeFalsy();
    });
  });

  describe('getUpdatedActionsParams', () => {
    it('updates one action', () => {
      const { id, ...rule } = {
        ...getRuleLegacyActions(),
        id: '123',
        actions: [],
        throttle: null,
        notifyWhen: 'onActiveAlert',
      } as RuleAlertType;

      expect(
        getUpdatedActionsParams({
          rule: {
            ...rule,
            id,
          },
          ruleThrottle: '1h',
          actions: [
            {
              actionRef: 'action_0',
              group: 'default',
              params: {
                message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
                to: ['a@a.com'],
                subject: 'Test Actions',
              },
              action_type_id: '.email',
            },
          ],
          references: [
            {
              id: '61ec7a40-b076-11ec-bb3f-1f063f8e06cf',
              type: 'alert',
              name: 'alert_0',
            },
            {
              id: '1234',
              type: 'action',
              name: 'action_0',
            },
          ],
        })
      ).toEqual({
        ...rule,
        actions: [
          {
            actionTypeId: '.email',
            group: 'default',
            id: '1234',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              subject: 'Test Actions',
              to: ['a@a.com'],
            },
          },
        ],
        throttle: '1h',
        notifyWhen: 'onThrottleInterval',
      });
    });

    it('updates multiple actions', () => {
      const { id, ...rule } = {
        ...getRuleLegacyActions(),
        id: '123',
        actions: [],
        throttle: null,
        notifyWhen: 'onActiveAlert',
      } as RuleAlertType;

      expect(
        getUpdatedActionsParams({
          rule: {
            ...rule,
            id,
          },
          ruleThrottle: '1h',
          actions: [
            {
              actionRef: 'action_0',
              group: 'default',
              params: {
                message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
                to: ['test@test.com'],
                subject: 'Rule email',
              },
              action_type_id: '.email',
            },
            {
              actionRef: 'action_1',
              group: 'default',
              params: {
                message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              },
              action_type_id: '.slack',
            },
          ],
          references: [
            {
              id: '064e3160-b076-11ec-bb3f-1f063f8e06cf',
              type: 'alert',
              name: 'alert_0',
            },
            {
              id: 'c95cb100-b075-11ec-bb3f-1f063f8e06cf',
              type: 'action',
              name: 'action_0',
            },
            {
              id: '207fa0e0-c04e-11ec-8a52-4fb92379525a',
              type: 'action',
              name: 'action_1',
            },
          ],
        })
      ).toEqual({
        ...rule,
        actions: [
          {
            actionTypeId: '.email',
            group: 'default',
            id: 'c95cb100-b075-11ec-bb3f-1f063f8e06cf',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              subject: 'Rule email',
              to: ['test@test.com'],
            },
          },
          {
            actionTypeId: '.slack',
            group: 'default',
            id: '207fa0e0-c04e-11ec-8a52-4fb92379525a',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
          },
        ],
        throttle: '1h',
        notifyWhen: 'onThrottleInterval',
      });
    });
  });
});
