/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization, ActionsClient } from '@kbn/actions-plugin/server';
import { RulesClientContext } from '../types';
import { ConnectorAdapterRegistry } from '../../connector_adapters/connector_adapter_registry';
import { RuleActionTypes } from '../../types';
import { getBeforeSetup } from '../tests/lib';
import { denormalizeActions } from './denormalize_actions';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

describe('denormalizeActions', () => {
  const kibanaVersion = 'v8.0.0';

  const context: jest.Mocked<RulesClientContext> = {
    taskManager,
    ruleTypeRegistry,
    unsecuredSavedObjectsClient,
    authorization: authorization as unknown as AlertingAuthorization,
    actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
    spaceId: 'default',
    getUserName: jest.fn(),
    createAPIKey: jest.fn(),
    logger: loggingSystemMock.create().get(),
    internalSavedObjectsRepository,
    encryptedSavedObjectsClient: encryptedSavedObjects,
    getActionsClient: jest.fn(),
    getEventLogClient: jest.fn(),
    kibanaVersion,
    maxScheduledPerMinute: 10000,
    minimumScheduleInterval: { value: '1m', enforce: false },
    minimumScheduleIntervalInMs: 1,
    fieldsToExcludeFromPublicApi: [],
    isAuthenticationTypeAPIKey: jest.fn(),
    getAuthenticationAPIKey: jest.fn(),
    connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  };

  beforeEach(() => {
    getBeforeSetup(context, taskManager, ruleTypeRegistry);
  });

  test('transforms a preconfigured action correctly', async () => {
    const actionsClient = (await context.getActionsClient()) as jest.Mocked<ActionsClient>;

    const action = {
      id: 'test-id',
      group: 'default',
      uuid: 'test-uuid',
      params: {},
      type: RuleActionTypes.DEFAULT,
    };

    actionsClient.isPreconfigured.mockReturnValue(true);

    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValue([
      {
        id: 'test-id',
        actionTypeId: 'action-type-id-test',
        config: {},
        isMissingSecrets: false,
        name: 'test connector',
        isPreconfigured: true,
        isDeprecated: false,
        isSystemAction: false,
      },
    ]);

    expect(await denormalizeActions(context, [action])).toEqual({
      actions: [
        {
          actionRef: 'preconfigured:test-id',
          group: 'default',
          uuid: 'test-uuid',
          params: {},
          actionTypeId: 'action-type-id-test',
        },
      ],
      references: [],
    });
  });

  test('transforms a system action correctly', async () => {
    const actionsClient = (await context.getActionsClient()) as jest.Mocked<ActionsClient>;

    const action = {
      id: 'test-id',
      uuid: 'test-uuid',
      params: {},
      type: RuleActionTypes.SYSTEM,
    };

    actionsClient.isSystemAction.mockReturnValue(true);

    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValue([
      {
        id: 'test-id',
        actionTypeId: 'action-type-id-test',
        config: {},
        isMissingSecrets: false,
        name: 'test connector',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: true,
      },
    ]);

    expect(await denormalizeActions(context, [action])).toEqual({
      actions: [
        {
          actionRef: 'system_action:test-id',
          uuid: 'test-uuid',
          params: {},
          actionTypeId: 'action-type-id-test',
        },
      ],
      references: [],
    });
  });

  test('transforms a default action correctly', async () => {
    const actionsClient = (await context.getActionsClient()) as jest.Mocked<ActionsClient>;

    const action = {
      id: 'test-id',
      group: 'default',
      uuid: 'test-uuid',
      params: {},
      type: RuleActionTypes.DEFAULT,
    };

    actionsClient.isPreconfigured.mockReturnValue(false);
    actionsClient.isSystemAction.mockReturnValue(false);

    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValue([
      {
        id: 'test-id',
        actionTypeId: 'action-type-id-test',
        config: {},
        isMissingSecrets: false,
        name: 'test connector',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: true,
      },
    ]);

    expect(await denormalizeActions(context, [action])).toEqual({
      actions: [
        {
          actionRef: 'action_0',
          group: 'default',
          uuid: 'test-uuid',
          params: {},
          actionTypeId: 'action-type-id-test',
        },
      ],
      references: [
        {
          id: 'test-id',
          name: 'action_0',
          type: 'action',
        },
      ],
    });
  });

  test('does not add extra attributes to a preconfigured action', async () => {
    const actionsClient = (await context.getActionsClient()) as jest.Mocked<ActionsClient>;

    const action = {
      id: 'test-id',
      group: 'default',
      uuid: 'test-uuid',
      params: {},
      foo: 'not-exists',
      type: RuleActionTypes.DEFAULT,
    };

    actionsClient.isPreconfigured.mockReturnValue(true);

    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValue([
      {
        id: 'test-id',
        actionTypeId: 'action-type-id-test',
        config: {},
        isMissingSecrets: false,
        name: 'test connector',
        isPreconfigured: true,
        isDeprecated: false,
        isSystemAction: false,
      },
    ]);

    expect(await denormalizeActions(context, [action])).toEqual({
      actions: [
        {
          actionRef: 'preconfigured:test-id',
          group: 'default',
          uuid: 'test-uuid',
          params: {},
          actionTypeId: 'action-type-id-test',
        },
      ],
      references: [],
    });
  });

  test('does not add extra attributes to a system action', async () => {
    const actionsClient = (await context.getActionsClient()) as jest.Mocked<ActionsClient>;

    const action = {
      id: 'test-id',
      group: 'not-exist',
      uuid: 'test-uuid',
      params: {},
      type: RuleActionTypes.SYSTEM,
    };

    actionsClient.isSystemAction.mockReturnValue(true);

    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValue([
      {
        id: 'test-id',
        actionTypeId: 'action-type-id-test',
        config: {},
        isMissingSecrets: false,
        name: 'test connector',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: true,
      },
    ]);

    expect(await denormalizeActions(context, [action])).toEqual({
      actions: [
        {
          actionRef: 'system_action:test-id',
          uuid: 'test-uuid',
          params: {},
          actionTypeId: 'action-type-id-test',
        },
      ],
      references: [],
    });
  });

  test('does not add extra attributes to a default action', async () => {
    const actionsClient = (await context.getActionsClient()) as jest.Mocked<ActionsClient>;

    const action = {
      id: 'test-id',
      group: 'default',
      uuid: 'test-uuid',
      params: {},
      foo: 'not-exists',
      type: RuleActionTypes.DEFAULT,
    };

    actionsClient.isPreconfigured.mockReturnValue(false);
    actionsClient.isSystemAction.mockReturnValue(false);

    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValue([
      {
        id: 'test-id',
        actionTypeId: 'action-type-id-test',
        config: {},
        isMissingSecrets: false,
        name: 'test connector',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: true,
      },
    ]);

    expect(await denormalizeActions(context, [action])).toEqual({
      actions: [
        {
          actionRef: 'action_0',
          group: 'default',
          uuid: 'test-uuid',
          params: {},
          actionTypeId: 'action-type-id-test',
        },
      ],
      references: [
        {
          id: 'test-id',
          name: 'action_0',
          type: 'action',
        },
      ],
    });
  });

  test('notify usage of action types', async () => {
    const actionsClient = (await context.getActionsClient()) as jest.Mocked<ActionsClient>;

    const action = {
      id: 'test-id',
      group: 'default',
      uuid: 'test-uuid',
      params: {},
      type: RuleActionTypes.DEFAULT,
    };

    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValue([
      {
        id: 'test-id',
        actionTypeId: 'action-type-id-test',
        config: {},
        isMissingSecrets: false,
        name: 'test connector',
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: true,
      },
    ]);

    await denormalizeActions(context, [action]);

    expect(actionsClient.isActionTypeEnabled).toHaveBeenCalledWith('action-type-id-test', {
      notifyUsage: true,
    });
  });
});
