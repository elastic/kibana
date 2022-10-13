/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAction } from '@kbn/alerting-plugin/common';

import {
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '../../../../../common/constants';

import type { FullResponseSchema } from '../../../../../common/detection_engine/schemas/request';
// eslint-disable-next-line no-restricted-imports
import type { LegacyRuleActions } from '../../rule_actions_legacy';
import type { RuleAlertType } from '../../rule_schema';

import {
  transformActions,
  transformFromAlertThrottle,
  transformToAlertThrottle,
  transformToNotifyWhen,
} from './rule_actions';

describe('Rule actions normalization', () => {
  describe('transformToNotifyWhen', () => {
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

  describe('transformToAlertThrottle', () => {
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

  describe('transformFromAlertThrottle', () => {
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
          } as RuleAlertType,
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
          } as unknown as RuleAlertType,
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
          } as unknown as RuleAlertType,
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
          } as RuleAlertType,
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
          } as RuleAlertType,
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
          } as RuleAlertType,
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
          } as unknown as RuleAlertType,
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
          } as unknown as RuleAlertType,
          legacyRuleActions
        )
      ).toEqual(NOTIFICATION_THROTTLE_RULE);
    });
  });

  describe('transformActions', () => {
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
});
