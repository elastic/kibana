/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { ActionTypeRegistry, ActionTypeRegistryOpts } from './action_type_registry';
import { ActionsClient } from './actions_client';
import { ExecutorType } from './types';
import { ActionExecutor, TaskRunnerFactory, ILicenseState } from './lib';
import { taskManagerMock } from '../../task_manager/server/task_manager.mock';
import { actionsConfigMock } from './actions_config.mock';
import { getActionsConfigurationUtilities } from './actions_config';
import { licenseStateMock } from './lib/license_state.mock';

import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../src/core/server/mocks';
import { actionExecutorMock } from './lib/action_executor.mock';
import uuid from 'uuid';
import { KibanaRequest } from 'kibana/server';
import { ActionsAuthorization } from './authorization/actions_authorization';
import { actionsAuthorizationMock } from './authorization/actions_authorization.mock';

const defaultKibanaIndex = '.kibana';
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const scopedClusterClient = elasticsearchServiceMock.createLegacyScopedClusterClient();
const actionExecutor = actionExecutorMock.create();
const authorization = actionsAuthorizationMock.create();
const executionEnqueuer = jest.fn();
const request = {} as KibanaRequest;

const mockTaskManager = taskManagerMock.setup();

let actionsClient: ActionsClient;
let mockedLicenseState: jest.Mocked<ILicenseState>;
let actionTypeRegistry: ActionTypeRegistry;
let actionTypeRegistryParams: ActionTypeRegistryOpts;
const executor: ExecutorType<{}, {}, {}, void> = async (options) => {
  return { status: 'ok', actionId: options.actionId };
};

beforeEach(() => {
  jest.resetAllMocks();
  mockedLicenseState = licenseStateMock.create();
  actionTypeRegistryParams = {
    taskManager: mockTaskManager,
    taskRunnerFactory: new TaskRunnerFactory(
      new ActionExecutor({ isESOUsingEphemeralEncryptionKey: false })
    ),
    actionsConfigUtils: actionsConfigMock.create(),
    licenseState: mockedLicenseState,
    preconfiguredActions: [],
  };
  actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
  actionsClient = new ActionsClient({
    actionTypeRegistry,
    unsecuredSavedObjectsClient,
    scopedClusterClient,
    defaultKibanaIndex,
    preconfiguredActions: [],
    actionExecutor,
    executionEnqueuer,
    request,
    authorization: (authorization as unknown) as ActionsAuthorization,
  });
});

describe('create()', () => {
  describe('authorization', () => {
    test('ensures user is authorised to create this type of action', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
        },
        references: [],
      };
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        executor,
      });
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      await actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
          secrets: {},
        },
      });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('create', 'my-action-type');
    });

    test('throws when user is not authorised to create this type of action', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
        },
        references: [],
      };
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        executor,
      });
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to create a "my-action-type" action`)
      );

      await expect(
        actionsClient.create({
          action: {
            name: 'my name',
            actionTypeId: 'my-action-type',
            config: {},
            secrets: {},
          },
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to create a "my-action-type" action]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('create', 'my-action-type');
    });
  });

  test('creates an action with all given properties', async () => {
    const savedObjectCreateResult = {
      id: '1',
      type: 'type',
      attributes: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        config: {},
      },
      references: [],
    };
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      executor,
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);
    const result = await actionsClient.create({
      action: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        config: {},
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: '1',
      isPreconfigured: false,
      name: 'my name',
      actionTypeId: 'my-action-type',
      config: {},
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {},
          "name": "my name",
          "secrets": Object {},
        },
      ]
    `);
  });

  test('validates config', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      validate: {
        config: schema.object({
          param1: schema.string(),
        }),
      },
      executor,
    });
    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  test(`throws an error when an action type doesn't exist`, async () => {
    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'unregistered-action-type',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"unregistered-action-type\\" is not registered."`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      executor,
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'type',
      attributes: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        config: {
          a: true,
          b: true,
          c: true,
        },
        secrets: {},
      },
      references: [],
    });
    const result = await actionsClient.create({
      action: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        config: {
          a: true,
          b: true,
          c: true,
        },
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: '1',
      isPreconfigured: false,
      name: 'my name',
      actionTypeId: 'my-action-type',
      config: {
        a: true,
        b: true,
        c: true,
      },
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {
            "a": true,
            "b": true,
            "c": true,
          },
          "name": "my name",
          "secrets": Object {},
        },
      ]
    `);
  });

  test('throws error creating action with disabled actionType', async () => {
    const localConfigUtils = getActionsConfigurationUtilities({
      enabled: true,
      enabledActionTypes: ['some-not-ignored-action-type'],
      allowedHosts: ['*'],
    });

    const localActionTypeRegistryParams = {
      taskManager: mockTaskManager,
      taskRunnerFactory: new TaskRunnerFactory(
        new ActionExecutor({ isESOUsingEphemeralEncryptionKey: false })
      ),
      actionsConfigUtils: localConfigUtils,
      licenseState: licenseStateMock.create(),
      preconfiguredActions: [],
    };

    actionTypeRegistry = new ActionTypeRegistry(localActionTypeRegistryParams);
    actionsClient = new ActionsClient({
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
      preconfiguredActions: [],
      actionExecutor,
      executionEnqueuer,
      request,
      authorization: (authorization as unknown) as ActionsAuthorization,
    });

    const savedObjectCreateResult = {
      id: '1',
      type: 'type',
      attributes: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        config: {},
      },
      references: [],
    };
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      executor,
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"action type \\"my-action-type\\" is not enabled in the Kibana config xpack.actions.enabledActionTypes"`
    );
  });

  test('throws error when ensureActionTypeEnabled throws', async () => {
    const savedObjectCreateResult = {
      id: '1',
      type: 'type',
      attributes: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        config: {},
      },
      references: [],
    };
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      executor,
    });
    mockedLicenseState.ensureLicenseForActionType.mockImplementation(() => {
      throw new Error('Fail');
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);
    await expect(
      actionsClient.create({
        action: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });
});

describe('get()', () => {
  describe('authorization', () => {
    test('ensures user is authorised to get the type of action', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'type',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
        },
        references: [],
      });

      await actionsClient.get({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });

    test('ensures user is authorised to get preconfigured type of action', async () => {
      actionsClient = new ActionsClient({
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        defaultKibanaIndex,
        actionExecutor,
        executionEnqueuer,
        request,
        authorization: (authorization as unknown) as ActionsAuthorization,
        preconfiguredActions: [
          {
            id: 'testPreconfigured',
            actionTypeId: 'my-action-type',
            secrets: {
              test: 'test1',
            },
            isPreconfigured: true,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
      });

      await actionsClient.get({ id: 'testPreconfigured' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });

    test('throws when user is not authorised to create the type of action', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'type',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          config: {},
        },
        references: [],
      });

      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get a "my-action-type" action`)
      );

      await expect(actionsClient.get({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get a "my-action-type" action]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });

    test('throws when user is not authorised to create preconfigured of action', async () => {
      actionsClient = new ActionsClient({
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        defaultKibanaIndex,
        actionExecutor,
        executionEnqueuer,
        request,
        authorization: (authorization as unknown) as ActionsAuthorization,
        preconfiguredActions: [
          {
            id: 'testPreconfigured',
            actionTypeId: 'my-action-type',
            secrets: {
              test: 'test1',
            },
            isPreconfigured: true,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
      });

      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get a "my-action-type" action`)
      );

      await expect(actionsClient.get({ id: 'testPreconfigured' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get a "my-action-type" action]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });
  });

  test('calls unsecuredSavedObjectsClient with id', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'type',
      attributes: {},
      references: [],
    });
    const result = await actionsClient.get({ id: '1' });
    expect(result).toEqual({
      id: '1',
      isPreconfigured: false,
    });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        "1",
      ]
    `);
  });

  test('return predefined action with id', async () => {
    actionsClient = new ActionsClient({
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
      actionExecutor,
      executionEnqueuer,
      request,
      authorization: (authorization as unknown) as ActionsAuthorization,
      preconfiguredActions: [
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {
            test: 'test1',
          },
          isPreconfigured: true,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
    });

    const result = await actionsClient.get({ id: 'testPreconfigured' });
    expect(result).toEqual({
      id: 'testPreconfigured',
      actionTypeId: '.slack',
      isPreconfigured: true,
      name: 'test',
    });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
  });
});

describe('getAll()', () => {
  describe('authorization', () => {
    function getAllOperation(): ReturnType<ActionsClient['getAll']> {
      const expectedResult = {
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: '1',
            type: 'type',
            attributes: {
              name: 'test',
              config: {
                foo: 'bar',
              },
            },
            score: 1,
            references: [],
          },
        ],
      };
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
      scopedClusterClient.callAsInternalUser.mockResolvedValueOnce({
        aggregations: {
          '1': { doc_count: 6 },
          testPreconfigured: { doc_count: 2 },
        },
      });

      actionsClient = new ActionsClient({
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        defaultKibanaIndex,
        actionExecutor,
        executionEnqueuer,
        request,
        authorization: (authorization as unknown) as ActionsAuthorization,
        preconfiguredActions: [
          {
            id: 'testPreconfigured',
            actionTypeId: '.slack',
            secrets: {},
            isPreconfigured: true,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
      });
      return actionsClient.getAll();
    }

    test('ensures user is authorised to get the type of action', async () => {
      await getAllOperation();
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get all actions`)
      );

      await expect(getAllOperation()).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get all actions]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });
  });

  test('calls unsecuredSavedObjectsClient with parameters', async () => {
    const expectedResult = {
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'type',
          attributes: {
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
          score: 1,
          references: [],
        },
      ],
    };
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce(expectedResult);
    scopedClusterClient.callAsInternalUser.mockResolvedValueOnce({
      aggregations: {
        '1': { doc_count: 6 },
        testPreconfigured: { doc_count: 2 },
      },
    });

    actionsClient = new ActionsClient({
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
      actionExecutor,
      executionEnqueuer,
      request,
      authorization: (authorization as unknown) as ActionsAuthorization,
      preconfiguredActions: [
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {},
          isPreconfigured: true,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
    });
    const result = await actionsClient.getAll();
    expect(result).toEqual([
      {
        id: '1',
        isPreconfigured: false,
        name: 'test',
        config: {
          foo: 'bar',
        },
        referencedByCount: 6,
      },
      {
        id: 'testPreconfigured',
        actionTypeId: '.slack',
        isPreconfigured: true,
        name: 'test',
        referencedByCount: 2,
      },
    ]);
  });
});

describe('getBulk()', () => {
  describe('authorization', () => {
    function getBulkOperation(): ReturnType<ActionsClient['getBulk']> {
      unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '1',
            type: 'action',
            attributes: {
              actionTypeId: 'test',
              name: 'test',
              config: {
                foo: 'bar',
              },
            },
            references: [],
          },
        ],
      });
      scopedClusterClient.callAsInternalUser.mockResolvedValueOnce({
        aggregations: {
          '1': { doc_count: 6 },
          testPreconfigured: { doc_count: 2 },
        },
      });

      actionsClient = new ActionsClient({
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        defaultKibanaIndex,
        actionExecutor,
        executionEnqueuer,
        request,
        authorization: (authorization as unknown) as ActionsAuthorization,
        preconfiguredActions: [
          {
            id: 'testPreconfigured',
            actionTypeId: '.slack',
            secrets: {},
            isPreconfigured: true,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
      });
      return actionsClient.getBulk(['1', 'testPreconfigured']);
    }

    test('ensures user is authorised to get the type of action', async () => {
      await getBulkOperation();
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get all actions`)
      );

      await expect(getBulkOperation()).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get all actions]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });
  });

  test('calls getBulk unsecuredSavedObjectsClient with parameters', async () => {
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actionTypeId: 'test',
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
          references: [],
        },
      ],
    });
    scopedClusterClient.callAsInternalUser.mockResolvedValueOnce({
      aggregations: {
        '1': { doc_count: 6 },
        testPreconfigured: { doc_count: 2 },
      },
    });

    actionsClient = new ActionsClient({
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
      actionExecutor,
      executionEnqueuer,
      request,
      authorization: (authorization as unknown) as ActionsAuthorization,
      preconfiguredActions: [
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {},
          isPreconfigured: true,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
    });
    const result = await actionsClient.getBulk(['1', 'testPreconfigured']);
    expect(result).toEqual([
      {
        actionTypeId: '.slack',
        config: {
          foo: 'bar',
        },
        id: 'testPreconfigured',
        isPreconfigured: true,
        name: 'test',
        secrets: {},
      },
      {
        actionTypeId: 'test',
        config: {
          foo: 'bar',
        },
        id: '1',
        isPreconfigured: false,
        name: 'test',
      },
    ]);
  });
});

describe('delete()', () => {
  describe('authorization', () => {
    test('ensures user is authorised to delete actions', async () => {
      await actionsClient.delete({ id: '1' });
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('delete');
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to delete all actions`)
      );

      await expect(actionsClient.delete({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to delete all actions]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('delete');
    });
  });

  test('calls unsecuredSavedObjectsClient with id', async () => {
    const expectedResult = Symbol();
    unsecuredSavedObjectsClient.delete.mockResolvedValueOnce(expectedResult);
    const result = await actionsClient.delete({ id: '1' });
    expect(result).toEqual(expectedResult);
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        "1",
      ]
    `);
  });
});

describe('update()', () => {
  describe('authorization', () => {
    function updateOperation(): ReturnType<ActionsClient['update']> {
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        executor,
      });
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'action',
        attributes: {
          actionTypeId: 'my-action-type',
        },
        references: [],
      });
      unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
        id: 'my-action',
        type: 'action',
        attributes: {
          actionTypeId: 'my-action-type',
          name: 'my name',
          config: {},
          secrets: {},
        },
        references: [],
      });
      return actionsClient.update({
        id: 'my-action',
        action: {
          name: 'my name',
          config: {},
          secrets: {},
        },
      });
    }
    test('ensures user is authorised to update actions', async () => {
      await updateOperation();
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('update');
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to update all actions`)
      );

      await expect(updateOperation()).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to update all actions]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('update');
    });
  });

  test('updates an action with all given properties', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      executor,
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
      },
      references: [],
    });
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        name: 'my name',
        config: {},
        secrets: {},
      },
      references: [],
    });
    const result = await actionsClient.update({
      id: 'my-action',
      action: {
        name: 'my name',
        config: {},
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: 'my-action',
      isPreconfigured: false,
      actionTypeId: 'my-action-type',
      name: 'my name',
      config: {},
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        "my-action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {},
          "name": "my name",
          "secrets": Object {},
        },
      ]
    `);
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        "my-action",
      ]
    `);
  });

  test('validates config', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      validate: {
        config: schema.object({
          param1: schema.string(),
        }),
      },
      executor,
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
      },
      references: [],
    });
    await expect(
      actionsClient.update({
        id: 'my-action',
        action: {
          name: 'my name',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      executor,
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
      },
      references: [],
    });
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        name: 'my name',
        config: {
          a: true,
          b: true,
          c: true,
        },
        secrets: {},
      },
      references: [],
    });
    const result = await actionsClient.update({
      id: 'my-action',
      action: {
        name: 'my name',
        config: {
          a: true,
          b: true,
          c: true,
        },
        secrets: {},
      },
    });
    expect(result).toEqual({
      id: 'my-action',
      isPreconfigured: false,
      actionTypeId: 'my-action-type',
      name: 'my name',
      config: {
        a: true,
        b: true,
        c: true,
      },
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        "my-action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {
            "a": true,
            "b": true,
            "c": true,
          },
          "name": "my name",
          "secrets": Object {},
        },
      ]
    `);
  });

  test('throws an error when ensureActionTypeEnabled throws', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      executor,
    });
    mockedLicenseState.ensureLicenseForActionType.mockImplementation(() => {
      throw new Error('Fail');
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
      },
      references: [],
    });
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        name: 'my name',
        config: {},
        secrets: {},
      },
      references: [],
    });
    await expect(
      actionsClient.update({
        id: 'my-action',
        action: {
          name: 'my name',
          config: {},
          secrets: {},
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });
});

describe('execute()', () => {
  describe('authorization', () => {
    test('ensures user is authorised to excecute actions', async () => {
      await actionsClient.execute({
        actionId: 'action-id',
        params: {
          name: 'my name',
        },
      });
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to execute all actions`)
      );

      await expect(
        actionsClient.execute({
          actionId: 'action-id',
          params: {
            name: 'my name',
          },
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to execute all actions]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });
  });

  test('calls the actionExecutor with the appropriate parameters', async () => {
    const actionId = uuid.v4();
    actionExecutor.execute.mockResolvedValue({ status: 'ok', actionId });
    await expect(
      actionsClient.execute({
        actionId,
        params: {
          name: 'my name',
        },
      })
    ).resolves.toMatchObject({ status: 'ok', actionId });

    expect(actionExecutor.execute).toHaveBeenCalledWith({
      actionId,
      request,
      params: {
        name: 'my name',
      },
    });
  });
});

describe('enqueueExecution()', () => {
  describe('authorization', () => {
    test('ensures user is authorised to excecute actions', async () => {
      await actionsClient.enqueueExecution({
        id: uuid.v4(),
        params: {},
        spaceId: 'default',
        apiKey: null,
      });
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to execute all actions`)
      );

      await expect(
        actionsClient.enqueueExecution({
          id: uuid.v4(),
          params: {},
          spaceId: 'default',
          apiKey: null,
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to execute all actions]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });
  });

  test('calls the executionEnqueuer with the appropriate parameters', async () => {
    const opts = {
      id: uuid.v4(),
      params: { baz: false },
      spaceId: 'default',
      apiKey: Buffer.from('123:abc').toString('base64'),
    };
    await expect(actionsClient.enqueueExecution(opts)).resolves.toMatchInlineSnapshot(`undefined`);

    expect(executionEnqueuer).toHaveBeenCalledWith(unsecuredSavedObjectsClient, opts);
  });
});
