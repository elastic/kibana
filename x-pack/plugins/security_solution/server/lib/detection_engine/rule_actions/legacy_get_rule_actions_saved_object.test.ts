/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindOptions, SavedObjectsFindResult } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

// eslint-disable-next-line no-restricted-imports
import {
  legacyGetRuleActionsSavedObject,
  LegacyRulesActionsSavedObject,
} from './legacy_get_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from './legacy_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import { LegacyIRuleActionsAttributesSavedObjectAttributes } from './legacy_types';

describe('legacy_get_rule_actions_saved_object', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  type FuncReturn = LegacyRulesActionsSavedObject | null;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      total: 0,
      per_page: 0,
      page: 1,
      saved_objects: [],
    });
  });

  test('calls "savedObjectsClient.find" with the expected "hasReferences"', () => {
    legacyGetRuleActionsSavedObject({ ruleAlertId: '123', savedObjectsClient, logger });
    const [[arg1]] = savedObjectsClient.find.mock.calls;
    expect(arg1).toEqual<SavedObjectsFindOptions>({
      hasReference: { id: '123', type: 'alert' },
      perPage: 1,
      type: legacyRuleActionsSavedObjectType,
    });
  });

  test('returns null if it does not return any matches against the alert id', async () => {
    const savedObjects: Array<
      SavedObjectsFindResult<LegacyIRuleActionsAttributesSavedObjectAttributes>
    > = [];
    savedObjectsClient.find.mockResolvedValue({
      total: 0,
      per_page: 0,
      page: 1,
      saved_objects: savedObjects,
    });

    const returnValue = await legacyGetRuleActionsSavedObject({
      ruleAlertId: '123',
      savedObjectsClient,
      logger,
    });
    expect(returnValue).toEqual<FuncReturn>(null);
  });

  test('returns 1 action transformed through the find if 1 was found for 1 single alert id', async () => {
    const savedObjects: Array<
      SavedObjectsFindResult<LegacyIRuleActionsAttributesSavedObjectAttributes>
    > = [
      {
        score: 0,
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
      },
    ];
    savedObjectsClient.find.mockResolvedValue({
      total: 0,
      per_page: 0,
      page: 1,
      saved_objects: savedObjects,
    });

    const returnValue = await legacyGetRuleActionsSavedObject({
      ruleAlertId: '123',
      savedObjectsClient,
      logger,
    });
    expect(returnValue).toEqual<FuncReturn>({
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

  test('returns 2 actions transformed through the find if they were found for 1 single alert id', async () => {
    const savedObjects: Array<
      SavedObjectsFindResult<LegacyIRuleActionsAttributesSavedObjectAttributes>
    > = [
      {
        score: 0,
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
      },
    ];
    savedObjectsClient.find.mockResolvedValue({
      total: 0,
      per_page: 0,
      page: 1,
      saved_objects: savedObjects,
    });

    const returnValue = await legacyGetRuleActionsSavedObject({
      ruleAlertId: '123',
      savedObjectsClient,
      logger,
    });
    expect(returnValue).toEqual<FuncReturn>({
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
      alertThrottle: '1d',
      id: '123',
      ruleThrottle: '1d',
    });
  });
});
