/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRuleAction } from '@kbn/alerting-plugin/common';
import {
  NOTIFICATION_DEFAULT_FREQUENCY,
  NOTIFICATION_THROTTLE_NO_ACTIONS,
  NOTIFICATION_THROTTLE_RULE,
} from '../../../../../common/constants';

import type { RuleAlertType } from '../../rule_schema';

import {
  transformFromAlertThrottle,
  transformToActionFrequency,
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
        transformFromAlertThrottle({
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
        } as RuleAlertType)
      ).toEqual(NOTIFICATION_THROTTLE_NO_ACTIONS);
    });

    test('returns "NOTIFICATION_THROTTLE_NO_ACTIONS" if actions is an empty array and we do not have a throttle', () => {
      expect(
        transformFromAlertThrottle({
          muteAll: false,
          notifyWhen: 'onActiveAlert',
          actions: [],
        } as unknown as RuleAlertType)
      ).toEqual(NOTIFICATION_THROTTLE_NO_ACTIONS);
    });

    test('returns "NOTIFICATION_THROTTLE_NO_ACTIONS" if actions is an empty array and we have a throttle', () => {
      expect(
        transformFromAlertThrottle({
          muteAll: false,
          notifyWhen: 'onThrottleInterval',
          actions: [],
          throttle: '1d',
        } as unknown as RuleAlertType)
      ).toEqual(NOTIFICATION_THROTTLE_NO_ACTIONS);
    });

    test('it returns "NOTIFICATION_THROTTLE_RULE" if "notifyWhen" is set, muteAll is false and we have an actions array', () => {
      expect(
        transformFromAlertThrottle({
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
        } as RuleAlertType)
      ).toEqual(NOTIFICATION_THROTTLE_RULE);
    });

    test('it returns "NOTIFICATION_THROTTLE_RULE" if "notifyWhen" and "throttle" are not set, but we have an actions array', () => {
      expect(
        transformFromAlertThrottle({
          muteAll: false,
          actions: [
            {
              group: 'group',
              id: 'id-123',
              actionTypeId: 'id-456',
              params: {},
            },
          ],
        } as RuleAlertType)
      ).toEqual(NOTIFICATION_THROTTLE_RULE);
    });
  });

  describe('transformToActionFrequency', () => {
    describe('actions without frequencies', () => {
      const actionsWithoutFrequencies: SanitizedRuleAction[] = [
        {
          group: 'group',
          id: 'id-123',
          actionTypeId: 'id-456',
          params: {},
        },
        {
          group: 'group',
          id: 'id-789',
          actionTypeId: 'id-012',
          params: {},
        },
      ];

      test.each([undefined, null, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE])(
        `it sets each action's frequency attribute to default value when 'throttle' is '%s'`,
        (throttle) => {
          expect(transformToActionFrequency(actionsWithoutFrequencies, throttle)).toEqual(
            actionsWithoutFrequencies.map((action) => ({
              ...action,
              frequency: NOTIFICATION_DEFAULT_FREQUENCY,
            }))
          );
        }
      );

      test.each(['47s', '10m', '3h', '101d'])(
        `it correctly transforms 'throttle = %s' and sets it as a frequency of each action`,
        (throttle) => {
          expect(transformToActionFrequency(actionsWithoutFrequencies, throttle)).toEqual(
            actionsWithoutFrequencies.map((action) => ({
              ...action,
              frequency: {
                summary: true,
                throttle,
                notifyWhen: 'onThrottleInterval',
              },
            }))
          );
        }
      );
    });

    describe('actions with frequencies', () => {
      const actionsWithFrequencies: SanitizedRuleAction[] = [
        {
          group: 'group',
          id: 'id-123',
          actionTypeId: 'id-456',
          params: {},
          frequency: {
            summary: true,
            throttle: null,
            notifyWhen: 'onActiveAlert',
          },
        },
        {
          group: 'group',
          id: 'id-789',
          actionTypeId: 'id-012',
          params: {},
          frequency: {
            summary: false,
            throttle: '1s',
            notifyWhen: 'onThrottleInterval',
          },
        },
      ];

      test.each([
        undefined,
        null,
        NOTIFICATION_THROTTLE_NO_ACTIONS,
        NOTIFICATION_THROTTLE_RULE,
        '1h',
        '1d',
      ])(`it does not change actions frequency attributes when 'throttle' is '%s'`, (throttle) => {
        expect(transformToActionFrequency(actionsWithFrequencies, throttle)).toEqual(
          actionsWithFrequencies
        );
      });
    });

    describe('some actions with frequencies', () => {
      const someActionsWithFrequencies: SanitizedRuleAction[] = [
        {
          group: 'group',
          id: 'id-123',
          actionTypeId: 'id-456',
          params: {},
          frequency: {
            summary: true,
            throttle: null,
            notifyWhen: 'onActiveAlert',
          },
        },
        {
          group: 'group',
          id: 'id-789',
          actionTypeId: 'id-012',
          params: {},
          frequency: {
            summary: false,
            throttle: '1s',
            notifyWhen: 'onThrottleInterval',
          },
        },
        {
          group: 'group',
          id: 'id-345',
          actionTypeId: 'id-678',
          params: {},
        },
      ];

      test.each([undefined, null, NOTIFICATION_THROTTLE_NO_ACTIONS, NOTIFICATION_THROTTLE_RULE])(
        `it overrides each action's frequency attribute to default value when 'throttle' is '%s'`,
        (throttle) => {
          expect(transformToActionFrequency(someActionsWithFrequencies, throttle)).toEqual(
            someActionsWithFrequencies.map((action) => ({
              ...action,
              frequency: action.frequency ?? NOTIFICATION_DEFAULT_FREQUENCY,
            }))
          );
        }
      );

      test.each(['47s', '10m', '3h', '101d'])(
        `it correctly transforms 'throttle = %s' and overrides frequency attribute of each action`,
        (throttle) => {
          expect(transformToActionFrequency(someActionsWithFrequencies, throttle)).toEqual(
            someActionsWithFrequencies.map((action) => ({
              ...action,
              frequency: action.frequency ?? {
                summary: true,
                throttle,
                notifyWhen: 'onThrottleInterval',
              },
            }))
          );
        }
      );
    });
  });
});
