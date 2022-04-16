/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindOptions, SavedObjectsFindResult } from '@kbn/core/server';

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

// eslint-disable-next-line no-restricted-imports
import { legacyGetBulkRuleActionsSavedObject } from './legacy_get_bulk_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { LegacyRulesActionsSavedObject } from './legacy_get_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from './legacy_saved_object_mappings';
// eslint-disable-next-line no-restricted-imports
import { LegacyIRuleActionsAttributesSavedObjectAttributes } from './legacy_types';

describe('legacy_get_bulk_rule_actions_saved_object', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  type FuncReturn = Record<string, LegacyRulesActionsSavedObject>;

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
    legacyGetBulkRuleActionsSavedObject({ alertIds: ['123'], savedObjectsClient, logger });
    const [[arg1]] = savedObjectsClient.find.mock.calls;
    expect(arg1).toEqual<SavedObjectsFindOptions>({
      hasReference: [{ id: '123', type: 'alert' }],
      perPage: 10000,
      type: legacyRuleActionsSavedObjectType,
    });
  });

  test('returns nothing transformed through the find if it does not return any matches against the alert id', async () => {
    const savedObjects: Array<
      SavedObjectsFindResult<LegacyIRuleActionsAttributesSavedObjectAttributes>
    > = [];
    savedObjectsClient.find.mockResolvedValue({
      total: 0,
      per_page: 0,
      page: 1,
      saved_objects: savedObjects,
    });

    const returnValue = await legacyGetBulkRuleActionsSavedObject({
      alertIds: ['123'],
      savedObjectsClient,
      logger,
    });
    expect(returnValue).toEqual<FuncReturn>({});
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

    const returnValue = await legacyGetBulkRuleActionsSavedObject({
      alertIds: ['123'],
      savedObjectsClient,
      logger,
    });
    expect(returnValue).toEqual<FuncReturn>({
      'alert-123': {
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
        ],
      },
    });
  });

  test('returns 1 action transformed through the find for 2 alerts with 1 action each', async () => {
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
      {
        score: 0,
        id: '456',
        type: legacyRuleActionsSavedObjectType,
        references: [
          {
            name: 'alert_0',
            id: 'alert-456',
            type: 'alert',
          },
          {
            name: 'action_0',
            id: 'action-456',
            type: 'action',
          },
        ],
        attributes: {
          actions: [
            {
              group: 'group_2',
              params: {},
              action_type_id: 'action_type_2',
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

    const returnValue = await legacyGetBulkRuleActionsSavedObject({
      alertIds: ['123'],
      savedObjectsClient,
      logger,
    });
    expect(returnValue).toEqual<FuncReturn>({
      'alert-123': {
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
        ],
      },
      'alert-456': {
        id: '456',
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
      },
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

    const returnValue = await legacyGetBulkRuleActionsSavedObject({
      alertIds: ['123'],
      savedObjectsClient,
      logger,
    });
    expect(returnValue).toEqual<FuncReturn>({
      'alert-123': {
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
      },
    });
  });

  test('returns only 1 action if for some unusual reason the actions reference is missing an item for 1 single alert id', async () => {
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
          // Missing an "action_1" here. { name: 'action_1', id: 'action-456', type: 'action', },
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

    const returnValue = await legacyGetBulkRuleActionsSavedObject({
      alertIds: ['123'],
      savedObjectsClient,
      logger,
    });
    expect(returnValue).toEqual<FuncReturn>({
      'alert-123': {
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
        ],
      },
    });
  });

  test('returns only 1 action if for some unusual reason the action is missing from the attributes', async () => {
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
            // Missing the action of { group: 'group_2', params: {}, action_type_id: 'action_type_2', actionRef: 'action_1', },
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

    const returnValue = await legacyGetBulkRuleActionsSavedObject({
      alertIds: ['123'],
      savedObjectsClient,
      logger,
    });
    expect(returnValue).toEqual<FuncReturn>({
      'alert-123': {
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
        ],
      },
    });
  });

  test('returns nothing if the alert id is missing within the references array', async () => {
    const savedObjects: Array<
      SavedObjectsFindResult<LegacyIRuleActionsAttributesSavedObjectAttributes>
    > = [
      {
        score: 0,
        id: '123',
        type: legacyRuleActionsSavedObjectType,
        references: [
          // Missing the "alert_0" of  { name: 'alert_0', id: 'alert-123', type: 'alert', },
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

    const returnValue = await legacyGetBulkRuleActionsSavedObject({
      alertIds: ['123'],
      savedObjectsClient,
      logger,
    });
    expect(returnValue).toEqual<FuncReturn>({});
  });
});
