/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  calculateInterval,
  calculateVersion,
  calculateName,
  transformToNotifyWhen,
  transformToAlertThrottle,
  transformFromAlertThrottle,
  transformActions,
  legacyMigrate,
  getUpdatedActionsParams,
} from './utils';
import { RuleAction, SanitizedRule } from '@kbn/alerting-plugin/common';
import { RuleParams } from '../schemas/rule_schemas';
import {
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '../../../../common/constants';
import { FullResponseSchema } from '../../../../common/detection_engine/schemas/request';
// eslint-disable-next-line no-restricted-imports
import { LegacyRuleActions } from '../rule_actions/legacy_types';
import {
  getEmptyFindResult,
  legacyGetSiemNotificationRuleActionsSOResultWithSingleHit,
  legacyGetDailyNotificationResult,
  legacyGetHourlyNotificationResult,
  legacyGetWeeklyNotificationResult,
} from '../routes/__mocks__/request_responses';
import { requestContextMock } from '../routes/__mocks__';

const getRuleLegacyActions = (): SanitizedAlert<RuleParams> =>
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
  } as unknown as SanitizedAlert<RuleParams>);

describe('utils', () => {
  describe('#calculateInterval', () => {
    test('given a undefined interval, it returns the ruleInterval ', () => {
      const interval = calculateInterval(undefined, '10m');
      expect(interval).toEqual('10m');
    });

    test('given a undefined ruleInterval, it returns a undefined interval ', () => {
      const interval = calculateInterval('10m', undefined);
      expect(interval).toEqual('10m');
    });

    test('given both an undefined ruleInterval and a undefined interval, it returns 5m', () => {
      const interval = calculateInterval(undefined, undefined);
      expect(interval).toEqual('5m');
    });
  });

  describe('#calculateVersion', () => {
    test('returning the same version number if given an immutable but no updated version number', () => {
      expect(
        calculateVersion(true, 1, {
          author: [],
          buildingBlockType: undefined,
          description: 'some description change',
          eventCategoryOverride: undefined,
          falsePositives: undefined,
          query: undefined,
          language: undefined,
          license: undefined,
          outputIndex: undefined,
          savedId: undefined,
          timelineId: undefined,
          timelineTitle: undefined,
          meta: undefined,
          filters: [],
          from: undefined,
          index: undefined,
          interval: undefined,
          maxSignals: undefined,
          riskScore: undefined,
          riskScoreMapping: undefined,
          ruleNameOverride: undefined,
          name: undefined,
          severity: undefined,
          severityMapping: undefined,
          tags: undefined,
          threat: undefined,
          threshold: undefined,
          threatFilters: undefined,
          threatIndex: undefined,
          threatIndicatorPath: undefined,
          threatQuery: undefined,
          threatMapping: undefined,
          threatLanguage: undefined,
          concurrentSearches: undefined,
          itemsPerSearch: undefined,
          to: undefined,
          timestampOverride: undefined,
          type: undefined,
          references: undefined,
          version: undefined,
          namespace: undefined,
          note: undefined,
          anomalyThreshold: undefined,
          machineLearningJobId: undefined,
          exceptionsList: [],
        })
      ).toEqual(1);
    });

    test('returning an updated version number if given an immutable and an updated version number', () => {
      expect(
        calculateVersion(true, 2, {
          author: [],
          buildingBlockType: undefined,
          description: 'some description change',
          eventCategoryOverride: undefined,
          falsePositives: undefined,
          query: undefined,
          language: undefined,
          license: undefined,
          outputIndex: undefined,
          savedId: undefined,
          timelineId: undefined,
          timelineTitle: undefined,
          meta: undefined,
          filters: [],
          from: undefined,
          index: undefined,
          interval: undefined,
          maxSignals: undefined,
          riskScore: undefined,
          riskScoreMapping: undefined,
          ruleNameOverride: undefined,
          name: undefined,
          severity: undefined,
          severityMapping: undefined,
          tags: undefined,
          threat: undefined,
          threshold: undefined,
          threatFilters: undefined,
          threatIndex: undefined,
          threatIndicatorPath: undefined,
          threatQuery: undefined,
          threatMapping: undefined,
          threatLanguage: undefined,
          concurrentSearches: undefined,
          itemsPerSearch: undefined,
          to: undefined,
          timestampOverride: undefined,
          type: undefined,
          references: undefined,
          version: undefined,
          namespace: undefined,
          note: undefined,
          anomalyThreshold: undefined,
          machineLearningJobId: undefined,
          exceptionsList: [],
        })
      ).toEqual(2);
    });

    test('returning an updated version number if not given an immutable but but an updated description', () => {
      expect(
        calculateVersion(false, 1, {
          author: [],
          buildingBlockType: undefined,
          description: 'some description change',
          eventCategoryOverride: undefined,
          falsePositives: undefined,
          query: undefined,
          language: undefined,
          license: undefined,
          outputIndex: undefined,
          savedId: undefined,
          timelineId: undefined,
          timelineTitle: undefined,
          meta: undefined,
          filters: [],
          from: undefined,
          index: undefined,
          interval: undefined,
          maxSignals: undefined,
          riskScore: undefined,
          riskScoreMapping: undefined,
          ruleNameOverride: undefined,
          name: undefined,
          severity: undefined,
          severityMapping: undefined,
          tags: undefined,
          threat: undefined,
          threshold: undefined,
          threatFilters: undefined,
          threatIndex: undefined,
          threatIndicatorPath: undefined,
          threatQuery: undefined,
          threatMapping: undefined,
          threatLanguage: undefined,
          to: undefined,
          timestampOverride: undefined,
          concurrentSearches: undefined,
          itemsPerSearch: undefined,
          type: undefined,
          references: undefined,
          version: undefined,
          namespace: undefined,
          note: undefined,
          anomalyThreshold: undefined,
          machineLearningJobId: undefined,
          exceptionsList: [],
        })
      ).toEqual(2);
    });
  });

  describe('#calculateName', () => {
    test('should return the updated name when it and originalName is there', () => {
      const name = calculateName({ updatedName: 'updated', originalName: 'original' });
      expect(name).toEqual('updated');
    });

    test('should return the updated name when originalName is undefined', () => {
      const name = calculateName({ updatedName: 'updated', originalName: undefined });
      expect(name).toEqual('updated');
    });

    test('should return the original name when updatedName is undefined', () => {
      const name = calculateName({ updatedName: undefined, originalName: 'original' });
      expect(name).toEqual('original');
    });

    test('should return untitled when both updatedName and originalName is undefined', () => {
      const name = calculateName({ updatedName: undefined, originalName: undefined });
      expect(name).toEqual('untitled');
    });
  });

  describe('#transformToNotifyWhen', () => {
    test('"null" throttle returns "null" notify', () => {
      expect(transformToNotifyWhen(null)).toEqual(null);
    });

    test('"undefined" throttle returns "null" notify', () => {
      expect(transformToNotifyWhen(undefined)).toEqual(null);
    });

    test('"NOTIFICATION_THROTTLE_NO_ACTIONS" throttle returns "null" notify', () => {
      expect(transformToNotifyWhen(NOTIFICATION_THROTTLE_NO_ACTIONS)).toEqual(null);
    });

    test('"NOTIFICATION_THROTTLE_RULE" throttle returns "onActiveAlert" notify', () => {
      expect(transformToNotifyWhen(NOTIFICATION_THROTTLE_RULE)).toEqual('onActiveAlert');
    });

    test('"1h" throttle returns "onThrottleInterval" notify', () => {
      expect(transformToNotifyWhen('1d')).toEqual('onThrottleInterval');
    });

    test('"1d" throttle returns "onThrottleInterval" notify', () => {
      expect(transformToNotifyWhen('1d')).toEqual('onThrottleInterval');
    });

    test('"7d" throttle returns "onThrottleInterval" notify', () => {
      expect(transformToNotifyWhen('7d')).toEqual('onThrottleInterval');
    });
  });

  describe('#transformToAlertThrottle', () => {
    test('"null" throttle returns "null" alert throttle', () => {
      expect(transformToAlertThrottle(null)).toEqual(null);
    });

    test('"undefined" throttle returns "null" alert throttle', () => {
      expect(transformToAlertThrottle(undefined)).toEqual(null);
    });

    test('"NOTIFICATION_THROTTLE_NO_ACTIONS" throttle returns "null" alert throttle', () => {
      expect(transformToAlertThrottle(NOTIFICATION_THROTTLE_NO_ACTIONS)).toEqual(null);
    });

    test('"NOTIFICATION_THROTTLE_RULE" throttle returns "null" alert throttle', () => {
      expect(transformToAlertThrottle(NOTIFICATION_THROTTLE_RULE)).toEqual(null);
    });

    test('"1h" throttle returns "1h" alert throttle', () => {
      expect(transformToAlertThrottle('1h')).toEqual('1h');
    });

    test('"1d" throttle returns "1d" alert throttle', () => {
      expect(transformToAlertThrottle('1d')).toEqual('1d');
    });

    test('"7d" throttle returns "7d" alert throttle', () => {
      expect(transformToAlertThrottle('7d')).toEqual('7d');
    });
  });

  describe('#transformFromAlertThrottle', () => {
    test('muteAll returns "NOTIFICATION_THROTTLE_NO_ACTIONS" even with notifyWhen set and actions has an array element', () => {
      expect(
        transformFromAlertThrottle(
          {
            muteAll: true,
            notifyWhen: 'onActiveAlert',
            actions: [
              {
                group: 'group',
                id: 'id-123',
                actionTypeId: 'id-456',
                params: {},
              },
            ],
          } as SanitizedRule<RuleParams>,
          undefined
        )
      ).toEqual(NOTIFICATION_THROTTLE_NO_ACTIONS);
    });

    test('returns "NOTIFICATION_THROTTLE_NO_ACTIONS" if actions is an empty array and we do not have a throttle', () => {
      expect(
        transformFromAlertThrottle(
          {
            muteAll: false,
            notifyWhen: 'onActiveAlert',
            actions: [],
          } as unknown as SanitizedRule<RuleParams>,
          undefined
        )
      ).toEqual(NOTIFICATION_THROTTLE_NO_ACTIONS);
    });

    test('returns "NOTIFICATION_THROTTLE_NO_ACTIONS" if actions is an empty array and we have a throttle', () => {
      expect(
        transformFromAlertThrottle(
          {
            muteAll: false,
            notifyWhen: 'onThrottleInterval',
            actions: [],
            throttle: '1d',
          } as unknown as SanitizedRule<RuleParams>,
          undefined
        )
      ).toEqual(NOTIFICATION_THROTTLE_NO_ACTIONS);
    });

    test('it returns "NOTIFICATION_THROTTLE_RULE" if "notifyWhen" is set, muteAll is false and we have an actions array', () => {
      expect(
        transformFromAlertThrottle(
          {
            muteAll: false,
            notifyWhen: 'onActiveAlert',
            actions: [
              {
                group: 'group',
                id: 'id-123',
                actionTypeId: 'id-456',
                params: {},
              },
            ],
          } as SanitizedRule<RuleParams>,
          undefined
        )
      ).toEqual(NOTIFICATION_THROTTLE_RULE);
    });

    test('it returns "NOTIFICATION_THROTTLE_RULE" if "notifyWhen" and "throttle" are not set, but we have an actions array', () => {
      expect(
        transformFromAlertThrottle(
          {
            muteAll: false,
            actions: [
              {
                group: 'group',
                id: 'id-123',
                actionTypeId: 'id-456',
                params: {},
              },
            ],
          } as SanitizedRule<RuleParams>,
          undefined
        )
      ).toEqual(NOTIFICATION_THROTTLE_RULE);
    });

    test('it will use the "rule" and not the "legacyRuleActions" if the rule and actions is defined', () => {
      const legacyRuleActions: LegacyRuleActions = {
        id: 'id_1',
        ruleThrottle: '',
        alertThrottle: '',
        actions: [
          {
            id: 'id_2',
            group: 'group',
            action_type_id: 'actionTypeId',
            params: {},
          },
        ],
      };

      expect(
        transformFromAlertThrottle(
          {
            muteAll: true,
            notifyWhen: 'onActiveAlert',
            actions: [
              {
                group: 'group',
                id: 'id-123',
                actionTypeId: 'id-456',
                params: {},
              },
            ],
          } as SanitizedRule<RuleParams>,
          legacyRuleActions
        )
      ).toEqual(NOTIFICATION_THROTTLE_NO_ACTIONS);
    });

    test('it will use the "legacyRuleActions" and not the "rule" if the rule actions is an empty array', () => {
      const legacyRuleActions: LegacyRuleActions = {
        id: 'id_1',
        ruleThrottle: NOTIFICATION_THROTTLE_RULE,
        alertThrottle: null,
        actions: [
          {
            id: 'id_2',
            group: 'group',
            action_type_id: 'actionTypeId',
            params: {},
          },
        ],
      };

      expect(
        transformFromAlertThrottle(
          {
            muteAll: true,
            notifyWhen: 'onActiveAlert',
            actions: [],
          } as unknown as SanitizedRule<RuleParams>,
          legacyRuleActions
        )
      ).toEqual(NOTIFICATION_THROTTLE_RULE);
    });

    test('it will use the "legacyRuleActions" and not the "rule" if the rule actions is a null', () => {
      const legacyRuleActions: LegacyRuleActions = {
        id: 'id_1',
        ruleThrottle: NOTIFICATION_THROTTLE_RULE,
        alertThrottle: null,
        actions: [
          {
            id: 'id_2',
            group: 'group',
            action_type_id: 'actionTypeId',
            params: {},
          },
        ],
      };

      expect(
        transformFromAlertThrottle(
          {
            muteAll: true,
            notifyWhen: 'onActiveAlert',
            actions: null,
          } as unknown as SanitizedRule<RuleParams>,
          legacyRuleActions
        )
      ).toEqual(NOTIFICATION_THROTTLE_RULE);
    });
  });

  describe('#transformActions', () => {
    test('It transforms two alert actions', () => {
      const alertAction: RuleAction[] = [
        {
          id: 'id_1',
          group: 'group',
          actionTypeId: 'actionTypeId',
          params: {},
        },
        {
          id: 'id_2',
          group: 'group',
          actionTypeId: 'actionTypeId',
          params: {},
        },
      ];

      const transformed = transformActions(alertAction, null);
      expect(transformed).toEqual<FullResponseSchema['actions']>([
        {
          id: 'id_1',
          group: 'group',
          action_type_id: 'actionTypeId',
          params: {},
        },
        {
          id: 'id_2',
          group: 'group',
          action_type_id: 'actionTypeId',
          params: {},
        },
      ]);
    });

    test('It transforms two alert actions but not a legacyRuleActions if this is also passed in', () => {
      const alertAction: RuleAction[] = [
        {
          id: 'id_1',
          group: 'group',
          actionTypeId: 'actionTypeId',
          params: {},
        },
        {
          id: 'id_2',
          group: 'group',
          actionTypeId: 'actionTypeId',
          params: {},
        },
      ];
      const legacyRuleActions: LegacyRuleActions = {
        id: 'id_1',
        ruleThrottle: '',
        alertThrottle: '',
        actions: [
          {
            id: 'id_2',
            group: 'group',
            action_type_id: 'actionTypeId',
            params: {},
          },
        ],
      };
      const transformed = transformActions(alertAction, legacyRuleActions);
      expect(transformed).toEqual<FullResponseSchema['actions']>([
        {
          id: 'id_1',
          group: 'group',
          action_type_id: 'actionTypeId',
          params: {},
        },
        {
          id: 'id_2',
          group: 'group',
          action_type_id: 'actionTypeId',
          params: {},
        },
      ]);
    });

    test('It will transform the legacyRuleActions if the alertAction is an empty array', () => {
      const alertAction: RuleAction[] = [];
      const legacyRuleActions: LegacyRuleActions = {
        id: 'id_1',
        ruleThrottle: '',
        alertThrottle: '',
        actions: [
          {
            id: 'id_2',
            group: 'group',
            action_type_id: 'actionTypeId',
            params: {},
          },
        ],
      };
      const transformed = transformActions(alertAction, legacyRuleActions);
      expect(transformed).toEqual<FullResponseSchema['actions']>([
        {
          id: 'id_2',
          group: 'group',
          action_type_id: 'actionTypeId',
          params: {},
        },
      ]);
    });

    test('It will transform the legacyRuleActions if the alertAction is undefined', () => {
      const legacyRuleActions: LegacyRuleActions = {
        id: 'id_1',
        ruleThrottle: '',
        alertThrottle: '',
        actions: [
          {
            id: 'id_2',
            group: 'group',
            action_type_id: 'actionTypeId',
            params: {},
          },
        ],
      };
      const transformed = transformActions(undefined, legacyRuleActions);
      expect(transformed).toEqual<FullResponseSchema['actions']>([
        {
          id: 'id_2',
          group: 'group',
          action_type_id: 'actionTypeId',
          params: {},
        },
      ]);
    });
  });

  describe('#legacyMigrate', () => {
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
      } as SanitizedAlert<RuleParams>;

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

  describe('#getUpdatedActionsParams', () => {
    it('throws if no connector id can be found', () => {
      expect(
        getUpdatedActionsParams({
          rule: {
            ...getRuleLegacyActions(),
            id: '123',
            actions: [],
            throttle: null,
            notifyWhen: 'onActiveAlert',
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
          ],
        })
      ).toThrowError();
    });
  });
});
