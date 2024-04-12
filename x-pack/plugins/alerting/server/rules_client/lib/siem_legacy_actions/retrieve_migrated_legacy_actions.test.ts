/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientContext } from '../..';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import {
  legacyGetDailyNotificationResult,
  legacyGetHourlyNotificationResult,
  legacyGetSiemNotificationRuleActionsSOResultWithSingleHit,
  legacyGetWeeklyNotificationResult,
} from './retrieve_migrated_legacy_actions.mock';

import { retrieveMigratedLegacyActions } from './retrieve_migrated_legacy_actions';

import { findRules } from '../../../application/rule/methods/find/find_rules';
import { deleteRule } from '../../methods/delete';

jest.mock('../../../application/rule/methods/find/find_rules', () => {
  return {
    findRules: jest.fn(),
  };
});

jest.mock('../../methods/delete', () => {
  return {
    deleteRule: jest.fn(),
  };
});

const findMock = findRules as jest.Mock;
const deleteRuleMock = deleteRule as jest.Mock;

const getEmptyFindResult = () => ({
  page: 0,
  per_page: 0,
  total: 0,
  data: [],
});

describe('Legacy rule action migration logic', () => {
  describe('legacyMigrate', () => {
    let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
    let logger: ReturnType<typeof loggingSystemMock.createLogger>;

    beforeEach(() => {
      logger = loggingSystemMock.createLogger();
      savedObjectsClient = savedObjectsClientMock.create();
    });

    const ruleId = '123';
    const connectorId = '456';

    test('it does no cleanup or migration if no legacy remnants found', async () => {
      findMock.mockResolvedValueOnce(getEmptyFindResult());
      savedObjectsClient.find.mockResolvedValueOnce({
        total: 0,
        per_page: 0,
        page: 1,
        saved_objects: [],
      });

      const migratedProperties = await retrieveMigratedLegacyActions(
        {
          unsecuredSavedObjectsClient: savedObjectsClient,
          logger,
        } as unknown as RulesClientContext,
        { ruleId },
        () => Promise.resolve()
      );

      expect(deleteRuleMock).not.toHaveBeenCalled();
      expect(savedObjectsClient.delete).not.toHaveBeenCalled();
      expect(migratedProperties).toEqual({ legacyActions: [], legacyActionsReferences: [] });
    });

    // Even if a rule is created with no actions pre 7.16, a
    // siem-detection-engine-rule-actions SO is still created
    test('it migrates a rule with no actions', async () => {
      // siem.notifications is not created for a rule with no actions
      findMock.mockResolvedValueOnce(getEmptyFindResult());
      // siem-detection-engine-rule-actions SO is still created
      savedObjectsClient.find.mockResolvedValueOnce(
        legacyGetSiemNotificationRuleActionsSOResultWithSingleHit(['none'], ruleId, connectorId)
      );

      const migratedProperties = await retrieveMigratedLegacyActions(
        {
          unsecuredSavedObjectsClient: savedObjectsClient,
          logger,
        } as unknown as RulesClientContext,
        { ruleId },
        () => Promise.resolve()
      );

      expect(deleteRuleMock).not.toHaveBeenCalled();
      expect(savedObjectsClient.delete).toHaveBeenCalledWith(
        'siem-detection-engine-rule-actions',
        'ID_OF_LEGACY_SIDECAR_NO_ACTIONS'
      );
      expect(migratedProperties).toEqual({ legacyActions: [], legacyActionsReferences: [] });
    });

    test('it migrates a rule with every rule run action', async () => {
      // siem.notifications is not created for a rule with actions run every rule run
      findMock.mockResolvedValueOnce(getEmptyFindResult());
      // siem-detection-engine-rule-actions SO is still created
      savedObjectsClient.find.mockResolvedValueOnce(
        legacyGetSiemNotificationRuleActionsSOResultWithSingleHit(['rule'], ruleId, connectorId)
      );

      const migratedProperties = await retrieveMigratedLegacyActions(
        {
          unsecuredSavedObjectsClient: savedObjectsClient,
          logger,
        } as unknown as RulesClientContext,
        { ruleId },
        () => Promise.resolve()
      );

      expect(deleteRuleMock).not.toHaveBeenCalled();
      expect(savedObjectsClient.delete).toHaveBeenCalledWith(
        'siem-detection-engine-rule-actions',
        'ID_OF_LEGACY_SIDECAR_RULE_RUN_ACTIONS'
      );

      expect(migratedProperties).toEqual({ legacyActions: [], legacyActionsReferences: [] });
    });

    test('it migrates a rule with daily legacy actions', async () => {
      // siem.notifications is not created for a rule with no actions
      findMock.mockResolvedValueOnce({
        page: 1,
        perPage: 1,
        total: 1,
        data: [legacyGetDailyNotificationResult(connectorId, ruleId)],
      });
      // siem-detection-engine-rule-actions SO is still created
      savedObjectsClient.find.mockResolvedValueOnce(
        legacyGetSiemNotificationRuleActionsSOResultWithSingleHit(['daily'], ruleId, connectorId)
      );

      const migratedProperties = await retrieveMigratedLegacyActions(
        {
          unsecuredSavedObjectsClient: savedObjectsClient,
          logger,
        } as unknown as RulesClientContext,
        { ruleId },
        () => Promise.resolve()
      );

      expect(deleteRuleMock).toHaveBeenCalledWith(expect.any(Object), { id: '456' });
      expect(savedObjectsClient.delete).toHaveBeenCalledWith(
        'siem-detection-engine-rule-actions',
        'ID_OF_LEGACY_SIDECAR_DAILY_ACTIONS'
      );

      expect(migratedProperties).toEqual({
        legacyActions: [
          {
            actionRef: 'action_0',
            actionTypeId: '.email',
            frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1d' },
            group: 'default',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              subject: 'Test Actions',
              to: ['test@test.com'],
            },
            uuid: expect.any(String),
          },
        ],
        legacyActionsReferences: [{ id: '456', name: 'action_0', type: 'action' }],
      });
    });

    test('it migrates a rule with hourly legacy actions', async () => {
      // siem.notifications is not created for a rule with no actions
      findMock.mockResolvedValueOnce({
        page: 1,
        perPage: 1,
        total: 1,
        data: [legacyGetHourlyNotificationResult(connectorId, ruleId)],
      });
      // siem-detection-engine-rule-actions SO is still created
      savedObjectsClient.find.mockResolvedValueOnce(
        legacyGetSiemNotificationRuleActionsSOResultWithSingleHit(['hourly'], ruleId, connectorId)
      );

      const migratedProperties = await retrieveMigratedLegacyActions(
        {
          unsecuredSavedObjectsClient: savedObjectsClient,
          logger,
        } as unknown as RulesClientContext,
        { ruleId },
        () => Promise.resolve()
      );

      expect(deleteRuleMock).toHaveBeenCalledWith(expect.any(Object), { id: '456' });
      expect(savedObjectsClient.delete).toHaveBeenCalledWith(
        'siem-detection-engine-rule-actions',
        'ID_OF_LEGACY_SIDECAR_HOURLY_ACTIONS'
      );
      expect(migratedProperties).toEqual({
        legacyActions: [
          {
            actionRef: 'action_0',
            actionTypeId: '.email',
            frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1h' },
            group: 'default',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              subject: 'Test Actions',
              to: ['test@test.com'],
            },
            uuid: expect.any(String),
          },
        ],
        legacyActionsReferences: [{ id: '456', name: 'action_0', type: 'action' }],
      });
    });

    test('it migrates a rule with weekly legacy actions', async () => {
      // siem.notifications is not created for a rule with no actions
      findMock.mockResolvedValueOnce({
        page: 1,
        perPage: 1,
        total: 1,
        data: [legacyGetWeeklyNotificationResult(connectorId, ruleId)],
      });
      // siem-detection-engine-rule-actions SO is still created
      savedObjectsClient.find.mockResolvedValueOnce(
        legacyGetSiemNotificationRuleActionsSOResultWithSingleHit(['weekly'], ruleId, connectorId)
      );

      const migratedProperties = await retrieveMigratedLegacyActions(
        {
          unsecuredSavedObjectsClient: savedObjectsClient,
          logger,
        } as unknown as RulesClientContext,
        { ruleId },
        () => Promise.resolve()
      );

      expect(deleteRuleMock).toHaveBeenCalledWith(expect.any(Object), { id: '456' });
      expect(savedObjectsClient.delete).toHaveBeenCalledWith(
        'siem-detection-engine-rule-actions',
        'ID_OF_LEGACY_SIDECAR_WEEKLY_ACTIONS'
      );
      expect(migratedProperties).toEqual({
        legacyActions: [
          {
            actionRef: 'action_0',
            actionTypeId: '.email',
            frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '7d' },
            group: 'default',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              subject: 'Test Actions',
              to: ['test@test.com'],
            },
            uuid: expect.any(String),
          },
        ],
        legacyActionsReferences: [{ id: '456', name: 'action_0', type: 'action' }],
      });
    });

    test('it calls validateLegacyActions on migration a rule with legacy actions', async () => {
      // siem.notifications is not created for a rule with no actions
      findMock.mockResolvedValueOnce({
        page: 1,
        perPage: 1,
        total: 1,
        data: [legacyGetDailyNotificationResult(connectorId, ruleId)],
      });
      // siem-detection-engine-rule-actions SO is still created
      savedObjectsClient.find.mockResolvedValueOnce(
        legacyGetSiemNotificationRuleActionsSOResultWithSingleHit(['daily'], ruleId, connectorId)
      );

      const validateLegacyActions = jest.fn();
      await retrieveMigratedLegacyActions(
        {
          unsecuredSavedObjectsClient: savedObjectsClient,
          logger,
        } as unknown as RulesClientContext,
        { ruleId },
        validateLegacyActions
      );

      expect(validateLegacyActions).toHaveBeenCalledWith(
        [
          {
            actionRef: 'action_0',
            actionTypeId: '.email',
            frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1d' },
            group: 'default',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              subject: 'Test Actions',
              to: ['test@test.com'],
            },
            uuid: expect.any(String),
          },
        ],
        [{ id: '456', name: 'action_0', type: 'action' }]
      );
    });
  });
});
