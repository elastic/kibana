/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { SavedObjectsFindResult, SavedObjectAttribute } from '@kbn/core/server';

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { Rule } from '../../../types';

import {
  legacyGetBulkRuleActionsSavedObject,
  LegacyActionsObj,
  formatLegacyActions,
} from './format_legacy_actions';
import { legacyRuleActionsSavedObjectType } from './types';

describe('legacyGetBulkRuleActionsSavedObject', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  type FuncReturn = Record<string, LegacyActionsObj>;

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

  test('calls "savedObjectsClient.find" with the expected "hasReferences"', async () => {
    await legacyGetBulkRuleActionsSavedObject({ alertIds: ['123'], savedObjectsClient, logger });
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
      hasReference: [{ id: '123', type: RULE_SAVED_OBJECT_TYPE }],
      perPage: 10000,
      type: legacyRuleActionsSavedObjectType,
    });
  });

  test('returns nothing transformed through the find if it does not return any matches against the alert id', async () => {
    const savedObjects: Array<SavedObjectsFindResult<SavedObjectAttribute>> = [];
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
    const savedObjects: Array<SavedObjectsFindResult<SavedObjectAttribute>> = [
      {
        score: 0,
        id: '123',
        type: legacyRuleActionsSavedObjectType,
        references: [
          {
            name: 'alert_0',
            id: 'alert-123',
            type: RULE_SAVED_OBJECT_TYPE,
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
        ruleThrottle: '1d',
        legacyRuleActions: [
          {
            actionTypeId: 'action_type_1',
            frequency: {
              notifyWhen: 'onThrottleInterval',
              summary: true,
              throttle: '1d',
            },
            group: 'group_1',
            id: 'action-123',
            params: {},
          },
        ],
      },
    });
  });

  test('returns 1 action transformed through the find for 2 alerts with 1 action each', async () => {
    const savedObjects: Array<SavedObjectsFindResult<SavedObjectAttribute>> = [
      {
        score: 0,
        id: '123',
        type: legacyRuleActionsSavedObjectType,
        references: [
          {
            name: 'alert_0',
            id: 'alert-123',
            type: RULE_SAVED_OBJECT_TYPE,
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
            type: RULE_SAVED_OBJECT_TYPE,
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
        ruleThrottle: '1d',

        legacyRuleActions: [
          {
            actionTypeId: 'action_type_1',
            frequency: {
              notifyWhen: 'onThrottleInterval',
              summary: true,
              throttle: '1d',
            },
            group: 'group_1',
            id: 'action-123',
            params: {},
          },
        ],
      },
      'alert-456': {
        ruleThrottle: '1d',
        legacyRuleActions: [
          {
            actionTypeId: 'action_type_2',
            frequency: {
              notifyWhen: 'onThrottleInterval',
              summary: true,
              throttle: '1d',
            },
            group: 'group_2',
            id: 'action-456',
            params: {},
          },
        ],
      },
    });
  });

  test('returns 2 actions transformed through the find if they were found for 1 single alert id', async () => {
    const savedObjects: Array<SavedObjectsFindResult<SavedObjectAttribute>> = [
      {
        score: 0,
        id: '123',
        type: legacyRuleActionsSavedObjectType,
        references: [
          {
            name: 'alert_0',
            id: 'alert-123',
            type: RULE_SAVED_OBJECT_TYPE,
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
        ruleThrottle: '1d',
        legacyRuleActions: [
          {
            actionTypeId: 'action_type_1',
            frequency: {
              notifyWhen: 'onThrottleInterval',
              summary: true,
              throttle: '1d',
            },
            group: 'group_1',
            id: 'action-123',
            params: {},
          },
          {
            actionTypeId: 'action_type_2',
            frequency: {
              notifyWhen: 'onThrottleInterval',
              summary: true,
              throttle: '1d',
            },
            group: 'group_2',
            id: 'action-456',
            params: {},
          },
        ],
      },
    });
  });

  test('returns only 1 action if for some unusual reason the actions reference is missing an item for 1 single alert id', async () => {
    const savedObjects: Array<SavedObjectsFindResult<SavedObjectAttribute>> = [
      {
        score: 0,
        id: '123',
        type: legacyRuleActionsSavedObjectType,
        references: [
          {
            name: 'alert_0',
            id: 'alert-123',
            type: RULE_SAVED_OBJECT_TYPE,
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
        ruleThrottle: '1d',
        legacyRuleActions: [
          {
            actionTypeId: 'action_type_1',
            frequency: {
              notifyWhen: 'onThrottleInterval',
              summary: true,
              throttle: '1d',
            },
            group: 'group_1',
            id: 'action-123',
            params: {},
          },
        ],
      },
    });
  });

  test('returns only 1 action if for some unusual reason the action is missing from the attributes', async () => {
    const savedObjects: Array<SavedObjectsFindResult<SavedObjectAttribute>> = [
      {
        score: 0,
        id: '123',
        type: legacyRuleActionsSavedObjectType,
        references: [
          {
            name: 'alert_0',
            id: 'alert-123',
            type: RULE_SAVED_OBJECT_TYPE,
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
        ruleThrottle: '1d',
        legacyRuleActions: [
          {
            actionTypeId: 'action_type_1',
            frequency: {
              notifyWhen: 'onThrottleInterval',
              summary: true,
              throttle: '1d',
            },
            group: 'group_1',
            id: 'action-123',
            params: {},
          },
        ],
      },
    });
  });

  test('returns nothing if the alert id is missing within the references array', async () => {
    const savedObjects: Array<SavedObjectsFindResult<SavedObjectAttribute>> = [
      {
        score: 0,
        id: '123',
        type: legacyRuleActionsSavedObjectType,
        references: [
          // Missing the "alert_0" of  { name: 'alert_0', id: 'alert-123', type: RULE_SAVED_OBJECT_TYPE, },
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

describe('formatLegacyActions', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    savedObjectsClient = savedObjectsClientMock.create();
  });

  it('should return not modified rule when error is thrown within method', async () => {
    savedObjectsClient.find.mockRejectedValueOnce(new Error('test failure'));
    const mockRules = [{ id: 'mock-id0' }, { id: 'mock-id1' }] as Rule[];
    expect(
      await formatLegacyActions(mockRules, {
        logger,
        savedObjectsClient,
      })
    ).toEqual(mockRules);

    expect(logger.error).toHaveBeenCalledWith(
      `formatLegacyActions(): Failed to read legacy actions for SIEM rules mock-id0, mock-id1: test failure`
    );
  });

  it('should format rule correctly', async () => {
    const savedObjects: Array<SavedObjectsFindResult<SavedObjectAttribute>> = [
      {
        score: 0,
        id: '123',
        type: legacyRuleActionsSavedObjectType,
        references: [
          {
            name: 'alert_0',
            id: 'alert-123',
            type: RULE_SAVED_OBJECT_TYPE,
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

    const mockRules = [
      {
        id: 'alert-123',
        actions: [
          {
            actionTypeId: 'action_type_2',
            group: 'group_1',
            id: 'action-456',
            params: {},
          },
        ],
      },
    ] as Rule[];
    const migratedRules = await formatLegacyActions(mockRules, {
      logger,
      savedObjectsClient,
    });

    expect(migratedRules).toEqual([
      {
        // actions have been merged
        actions: [
          {
            actionTypeId: 'action_type_2',
            group: 'group_1',
            id: 'action-456',
            params: {},
          },
          {
            actionTypeId: 'action_type_1',
            frequency: { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1d' },
            group: 'group_1',
            id: 'action-123',
            params: {},
          },
        ],
        id: 'alert-123',
        // muteAll set to false
        muteAll: false,
        notifyWhen: 'onThrottleInterval',
        throttle: '1d',
      },
    ]);
  });
});
