/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

// eslint-disable-next-line no-restricted-imports
import { legacyCreateRuleActionsSavedObject } from './legacy_create_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import type { LegacyIRuleActionsAttributesSavedObjectAttributes } from './legacy_types';

describe('legacy_create_rule_actions_saved_object', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
  });

  test('it creates a rule actions saved object with empty actions array', () => {
    legacyCreateRuleActionsSavedObject({
      ruleAlertId: '123',
      savedObjectsClient,
      actions: [],
      throttle: '1d',
    });
    const [[, arg2, arg3]] = savedObjectsClient.create.mock.calls;
    expect(arg2).toEqual<LegacyIRuleActionsAttributesSavedObjectAttributes>({
      actions: [],
      alertThrottle: '1d',
      ruleThrottle: '1d',
    });
    expect(arg3).toEqual({
      references: [
        {
          id: '123',
          name: 'alert_0',
          type: 'alert',
        },
      ],
    });
  });

  test('it creates a rule actions saved object with 1 single action', () => {
    legacyCreateRuleActionsSavedObject({
      ruleAlertId: '123',
      savedObjectsClient,
      actions: [
        {
          id: '456',
          group: 'default',
          actionTypeId: '.slack',
          params: {
            kibana_siem_app_url: 'www.example.com',
          },
        },
      ],
      throttle: '1d',
    });
    const [[, arg2, arg3]] = savedObjectsClient.create.mock.calls;
    expect(arg2).toEqual<LegacyIRuleActionsAttributesSavedObjectAttributes>({
      actions: [
        {
          actionRef: 'action_0',
          action_type_id: '.slack',
          group: 'default',
          params: {
            kibana_siem_app_url: 'www.example.com',
          },
        },
      ],
      alertThrottle: '1d',
      ruleThrottle: '1d',
    });
    expect(arg3).toEqual({
      references: [
        {
          id: '123',
          name: 'alert_0',
          type: 'alert',
        },
        {
          id: '456',
          name: 'action_0',
          type: 'action',
        },
      ],
    });
  });

  test('it creates a rule actions saved object with 2 actions', () => {
    legacyCreateRuleActionsSavedObject({
      ruleAlertId: '123',
      savedObjectsClient,
      actions: [
        {
          id: '456',
          group: 'default',
          actionTypeId: '.slack',
          params: {
            kibana_siem_app_url: 'www.example.com',
          },
        },
        {
          id: '555',
          group: 'default_2',
          actionTypeId: '.email',
          params: {
            kibana_siem_app_url: 'www.example.com/2',
          },
        },
      ],
      throttle: '1d',
    });
    const [[, arg2, arg3]] = savedObjectsClient.create.mock.calls;
    expect(arg2).toEqual<LegacyIRuleActionsAttributesSavedObjectAttributes>({
      actions: [
        {
          actionRef: 'action_0',
          action_type_id: '.slack',
          group: 'default',
          params: {
            kibana_siem_app_url: 'www.example.com',
          },
        },
        {
          actionRef: 'action_1',
          action_type_id: '.email',
          group: 'default_2',
          params: {
            kibana_siem_app_url: 'www.example.com/2',
          },
        },
      ],
      alertThrottle: '1d',
      ruleThrottle: '1d',
    });
    expect(arg3).toEqual({
      references: [
        {
          id: '123',
          name: 'alert_0',
          type: 'alert',
        },
        {
          id: '456',
          name: 'action_0',
          type: 'action',
        },
        {
          id: '555',
          name: 'action_1',
          type: 'action',
        },
      ],
    });
  });
});
