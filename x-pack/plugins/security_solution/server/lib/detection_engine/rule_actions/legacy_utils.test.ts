/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUpdateResponse } from 'kibana/server';
import { loggingSystemMock } from 'src/core/server/mocks';

import { RuleAction } from '../../../../../alerting/common';

// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from './legacy_saved_object_mappings';

// eslint-disable-next-line no-restricted-imports
import {
  LegacyIRuleActionsAttributesSavedObjectAttributes,
  LegacyRuleAlertAction,
} from './legacy_types';

// eslint-disable-next-line no-restricted-imports
import {
  legacyGetActionReference,
  legacyGetRuleActionsFromSavedObject,
  legacyGetRuleReference,
  legacyGetThrottleOptions,
  legacyTransformActionToReference,
  legacyTransformLegacyRuleAlertActionToReference,
} from './legacy_utils';

describe('legacy_utils', () => {
  describe('legacyGetRuleActionsFromSavedObject', () => {
    type FuncReturn = ReturnType<typeof legacyGetRuleActionsFromSavedObject>;
    let logger: ReturnType<typeof loggingSystemMock.createLogger>;

    beforeEach(() => {
      logger = loggingSystemMock.createLogger();
    });

    test('returns no_actions and an alert throttle of null if nothing is in the references or in the attributes', async () => {
      const savedObject: SavedObjectsUpdateResponse<LegacyIRuleActionsAttributesSavedObjectAttributes> =
        {
          id: '123',
          type: legacyRuleActionsSavedObjectType,
          references: [],
          attributes: {},
        };
      expect(legacyGetRuleActionsFromSavedObject(savedObject, logger)).toEqual<FuncReturn>({
        actions: [],
        alertThrottle: null,
        id: '123',
        ruleThrottle: 'no_actions',
      });
    });

    test('returns "no_throttle" if the rule throttle is not set', async () => {
      const savedObject: SavedObjectsUpdateResponse<LegacyIRuleActionsAttributesSavedObjectAttributes> =
        {
          id: '123',
          type: legacyRuleActionsSavedObjectType,
          references: [
            {
              name: 'alert_0',
              id: 'alert-123',
              type: 'alert',
            },
          ],
          attributes: {
            actions: [],
          },
        };
      expect(legacyGetRuleActionsFromSavedObject(savedObject, logger)).toEqual<FuncReturn>({
        actions: [],
        alertThrottle: null,
        id: '123',
        ruleThrottle: 'no_actions',
      });
    });

    test('returns 1 action transformed through the find if 1 was found for 1 single alert id', async () => {
      const savedObject: SavedObjectsUpdateResponse<LegacyIRuleActionsAttributesSavedObjectAttributes> =
        {
          id: '123',
          type: legacyRuleActionsSavedObjectType,
          references: [
            {
              name: 'alert_0',
              id: 'alert-123',
              type: 'alert',
            },
            {
              name: 'action_0',
              id: 'action-123',
              type: 'action',
            },
          ],
          attributes: {
            actions: [
              {
                group: 'group_1',
                params: {},
                action_type_id: 'action_type_1',
                actionRef: 'action_0',
              },
            ],
            ruleThrottle: '1d',
            alertThrottle: '1d',
          },
        };
      expect(legacyGetRuleActionsFromSavedObject(savedObject, logger)).toEqual<FuncReturn>({
        actions: [
          {
            action_type_id: 'action_type_1',
            group: 'group_1',
            id: 'action-123',
            params: {},
          },
        ],
        alertThrottle: '1d',
        id: '123',
        ruleThrottle: '1d',
      });
    });

    test('returns 2 actions transformed through the find if 1 was found for 1 single alert id', async () => {
      const savedObject: SavedObjectsUpdateResponse<LegacyIRuleActionsAttributesSavedObjectAttributes> =
        {
          id: '123',
          type: legacyRuleActionsSavedObjectType,
          references: [
            {
              name: 'alert_0',
              id: 'alert-123',
              type: 'alert',
            },
            {
              name: 'action_0',
              id: 'action-123',
              type: 'action',
            },
            {
              name: 'action_1',
              id: 'action-456',
              type: 'action',
            },
          ],
          attributes: {
            actions: [
              {
                group: 'group_1',
                params: {},
                action_type_id: 'action_type_1',
                actionRef: 'action_0',
              },
              {
                group: 'group_2',
                params: {},
                action_type_id: 'action_type_2',
                actionRef: 'action_1',
              },
            ],
            ruleThrottle: '1d',
            alertThrottle: '1d',
          },
        };
      expect(legacyGetRuleActionsFromSavedObject(savedObject, logger)).toEqual<FuncReturn>({
        id: '123',
        alertThrottle: '1d',
        ruleThrottle: '1d',
        actions: [
          {
            action_type_id: 'action_type_1',
            group: 'group_1',
            id: 'action-123',
            params: {},
          },
          {
            action_type_id: 'action_type_2',
            group: 'group_2',
            id: 'action-456',
            params: {},
          },
        ],
      });
    });

    test('returns 1 action transformed through the find if 1 was found for 1 single alert id a but a 2nd was not', async () => {
      const savedObject: SavedObjectsUpdateResponse<LegacyIRuleActionsAttributesSavedObjectAttributes> =
        {
          id: '123',
          type: legacyRuleActionsSavedObjectType,
          references: [
            {
              name: 'alert_0',
              id: 'alert-123',
              type: 'alert',
            },
            {
              name: 'action_1',
              id: 'action-456',
              type: 'action',
            },
          ],
          attributes: {
            actions: [
              {
                group: 'group_1',
                params: {},
                action_type_id: 'action_type_1',
                actionRef: 'action_0',
              },
              {
                group: 'group_2',
                params: {},
                action_type_id: 'action_type_2',
                actionRef: 'action_1',
              },
            ],
            ruleThrottle: '1d',
            alertThrottle: '1d',
          },
        };
      expect(legacyGetRuleActionsFromSavedObject(savedObject, logger)).toEqual<FuncReturn>({
        id: '123',
        alertThrottle: '1d',
        ruleThrottle: '1d',
        actions: [
          {
            action_type_id: 'action_type_2',
            group: 'group_2',
            id: 'action-456',
            params: {},
          },
        ],
      });
    });

    test('returns empty actions array and "no_actions" if it cannot be found in the references', async () => {
      const savedObject: SavedObjectsUpdateResponse<LegacyIRuleActionsAttributesSavedObjectAttributes> =
        {
          id: '123',
          type: legacyRuleActionsSavedObjectType,
          references: [
            {
              name: 'alert_0',
              id: 'alert-123',
              type: 'alert',
            },
          ],
          attributes: {
            actions: [
              {
                group: 'group_1',
                params: {},
                action_type_id: 'action_type_1',
                actionRef: 'action_0',
              },
            ],
            ruleThrottle: 'no_actions',
            alertThrottle: '1d',
          },
        };
      expect(legacyGetRuleActionsFromSavedObject(savedObject, logger)).toEqual<FuncReturn>({
        actions: [],
        alertThrottle: '1d',
        id: '123',
        ruleThrottle: 'no_actions',
      });
    });
  });

  describe('legacyGetThrottleOptions', () => {
    type FuncReturn = ReturnType<typeof legacyGetThrottleOptions>;

    test('it returns "no_actions" and "alertThrottle" set to "null" if given no throttle', () => {
      expect(legacyGetThrottleOptions()).toEqual<FuncReturn>({
        alertThrottle: null,
        ruleThrottle: 'no_actions',
      });
    });

    test('it returns "no_actions" and "alertThrottle" set to "null" if given a null throttle', () => {
      expect(legacyGetThrottleOptions(null)).toEqual<FuncReturn>({
        alertThrottle: null,
        ruleThrottle: 'no_actions',
      });
    });

    test('it returns "1d" if given a "1d" throttle', () => {
      expect(legacyGetThrottleOptions('1d')).toEqual<FuncReturn>({
        alertThrottle: '1d',
        ruleThrottle: '1d',
      });
    });

    test('it returns null and "no_actions" if given a "no_actions"', () => {
      expect(legacyGetThrottleOptions('no_actions')).toEqual<FuncReturn>({
        alertThrottle: null,
        ruleThrottle: 'no_actions',
      });
    });

    test('it returns null and "rule" if given a "rule"', () => {
      expect(legacyGetThrottleOptions('rule')).toEqual<FuncReturn>({
        alertThrottle: null,
        ruleThrottle: 'rule',
      });
    });
  });

  describe('legacyGetRuleReference', () => {
    type FuncReturn = ReturnType<typeof legacyGetRuleReference>;

    test('it returns the id transformed', () => {
      expect(legacyGetRuleReference('123')).toEqual<FuncReturn>({
        id: '123',
        name: 'alert_0',
        type: 'alert',
      });
    });
  });

  describe('legacyGetActionReference', () => {
    type FuncReturn = ReturnType<typeof legacyGetActionReference>;

    test('it returns the id and index transformed with the index at 0', () => {
      expect(legacyGetActionReference('123', 0)).toEqual<FuncReturn>({
        id: '123',
        name: 'action_0',
        type: 'action',
      });
    });

    test('it returns the id and index transformed with the index at 1', () => {
      expect(legacyGetActionReference('123', 1)).toEqual<FuncReturn>({
        id: '123',
        name: 'action_1',
        type: 'action',
      });
    });
  });

  describe('legacyTransformActionToReference', () => {
    type FuncReturn = ReturnType<typeof legacyTransformActionToReference>;
    const alertAction: RuleAction = {
      id: '123',
      group: 'group_1',
      params: {
        test: '123',
      },
      actionTypeId: '567',
    };

    test('it returns the id and index transformed with the index at 0', () => {
      expect(legacyTransformActionToReference(alertAction, 0)).toEqual<FuncReturn>({
        actionRef: 'action_0',
        action_type_id: '567',
        group: 'group_1',
        params: {
          test: '123',
        },
      });
    });

    test('it returns the id and index transformed with the index at 1', () => {
      expect(legacyTransformActionToReference(alertAction, 1)).toEqual<FuncReturn>({
        actionRef: 'action_1',
        action_type_id: '567',
        group: 'group_1',
        params: {
          test: '123',
        },
      });
    });
  });

  describe('legacyTransformLegacyRuleAlertActionToReference', () => {
    type FuncReturn = ReturnType<typeof legacyTransformLegacyRuleAlertActionToReference>;
    const alertAction: LegacyRuleAlertAction = {
      id: '123',
      group: 'group_1',
      params: {
        test: '123',
      },
      action_type_id: '567',
    };

    test('it returns the id and index transformed with the index at 0', () => {
      expect(legacyTransformLegacyRuleAlertActionToReference(alertAction, 0)).toEqual<FuncReturn>({
        actionRef: 'action_0',
        action_type_id: '567',
        group: 'group_1',
        params: {
          test: '123',
        },
      });
    });

    test('it returns the id and index transformed with the index at 1', () => {
      expect(legacyTransformLegacyRuleAlertActionToReference(alertAction, 1)).toEqual<FuncReturn>({
        actionRef: 'action_1',
        action_type_id: '567',
        group: 'group_1',
        params: {
          test: '123',
        },
      });
    });
  });
});
