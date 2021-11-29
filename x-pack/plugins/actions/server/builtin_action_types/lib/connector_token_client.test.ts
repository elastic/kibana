/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeRegistry, ActionTypeRegistryOpts } from './action_type_registry';
import { ActionsClient } from './actions_client';
import { ExecutorType } from './types';
import { ActionExecutor, TaskRunnerFactory, ILicenseState } from './lib';
import { taskManagerMock } from '../../task_manager/server/mocks';
import { actionsConfigMock } from './actions_config.mock';
import { licenseStateMock } from './lib/license_state.mock';
import { licensingMock } from '../../licensing/server/mocks';
import { httpServerMock } from '../../../../src/core/server/mocks';
import { auditServiceMock } from '../../security/server/audit/index.mock';
import { usageCountersServiceMock } from 'src/plugins/usage_collection/server/usage_counters/usage_counters_service.mock';

import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../src/core/server/mocks';
import { actionExecutorMock } from './lib/action_executor.mock';
import { ActionsAuthorization } from './authorization/actions_authorization';
import { actionsAuthorizationMock } from './authorization/actions_authorization.mock';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../src/core/server/elasticsearch/client/mocks';

jest.mock('../../../../src/core/server/saved_objects/service/lib/utils', () => ({
  SavedObjectsUtils: {
    generateId: () => 'mock-saved-object-id',
  },
}));

jest.mock('./lib/track_legacy_rbac_exemption', () => ({
  trackLegacyRBACExemption: jest.fn(),
}));

jest.mock('./authorization/get_authorization_mode_by_source', () => {
  return {
    getAuthorizationModeBySource: jest.fn(() => {
      return 1;
    }),
    AuthorizationMode: {
      Legacy: 0,
      RBAC: 1,
    },
  };
});

const defaultKibanaIndex = '.kibana';
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
const actionExecutor = actionExecutorMock.create();
const authorization = actionsAuthorizationMock.create();
const executionEnqueuer = jest.fn();
const ephemeralExecutionEnqueuer = jest.fn();
const request = httpServerMock.createKibanaRequest();
const auditLogger = auditServiceMock.create().asScoped(request);
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

const mockTaskManager = taskManagerMock.createSetup();

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
    licensing: licensingMock.createSetup(),
    taskManager: mockTaskManager,
    taskRunnerFactory: new TaskRunnerFactory(new ActionExecutor({ isESOCanEncrypt: true })),
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
    ephemeralExecutionEnqueuer,
    request,
    authorization: authorization as unknown as ActionsAuthorization,
    auditLogger,
    usageCounter: mockUsageCounter,
  });
});

describe('create()', () => {
  test('creates an action with all given properties', async () => {
    const savedObjectCreateResult = {
      id: '1',
      type: 'type',
      attributes: {
        name: 'my name',
        actionTypeId: 'my-action-type',
        isMissingSecrets: false,
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
      isMissingSecrets: false,
      config: {},
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {},
          "isMissingSecrets": false,
          "name": "my name",
          "secrets": Object {},
        },
        Object {
          "id": "mock-saved-object-id",
        },
      ]
    `);
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
        isMissingSecrets: false,
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
      isMissingSecrets: false,
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
          "isMissingSecrets": false,
          "name": "my name",
          "secrets": Object {},
        },
        Object {
          "id": "mock-saved-object-id",
        },
      ]
    `);
  });
});

describe('get()', () => {
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
            isMissingSecrets: false,
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
    scopedClusterClient.asInternalUser.search.mockResolvedValueOnce(
      // @ts-expect-error not full search response
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        aggregations: {
          '1': { doc_count: 6 },
          testPreconfigured: { doc_count: 2 },
        },
      })
    );

    actionsClient = new ActionsClient({
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
      actionExecutor,
      executionEnqueuer,
      ephemeralExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
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
        isMissingSecrets: false,
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

describe('update()', () => {
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
        isMissingSecrets: false,
      },
      references: [],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        isMissingSecrets: false,
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
      isMissingSecrets: false,
      name: 'my name',
      config: {},
    });
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "action",
        Object {
          "actionTypeId": "my-action-type",
          "config": Object {},
          "isMissingSecrets": false,
          "name": "my name",
          "secrets": Object {},
        },
        Object {
          "id": "my-action",
          "overwrite": true,
          "references": Array [],
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
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        isMissingSecrets: true,
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
      isMissingSecrets: true,
      name: 'my name',
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
          "isMissingSecrets": false,
          "name": "my name",
          "secrets": Object {},
        },
        Object {
          "id": "my-action",
          "overwrite": true,
          "references": Array [],
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
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: 'my-action',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        isMissingSecrets: false,
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
