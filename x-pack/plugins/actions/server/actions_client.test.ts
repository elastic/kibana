/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import moment from 'moment';
import { ByteSizeValue } from '@kbn/config-schema';

import { ActionTypeRegistry, ActionTypeRegistryOpts } from './action_type_registry';
import { ActionsClient } from './actions_client';
import { ExecutorType, ActionType } from './types';
import { ActionExecutor, TaskRunnerFactory, ILicenseState } from './lib';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { actionsConfigMock } from './actions_config.mock';
import { getActionsConfigurationUtilities } from './actions_config';
import { licenseStateMock } from './lib/license_state.mock';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import {
  httpServerMock,
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { actionExecutorMock } from './lib/action_executor.mock';
import uuid from 'uuid';
import { ActionsAuthorization } from './authorization/actions_authorization';
import {
  getAuthorizationModeBySource,
  AuthorizationMode,
  getBulkAuthorizationModeBySource,
} from './authorization/get_authorization_mode_by_source';
import { actionsAuthorizationMock } from './authorization/actions_authorization.mock';
import { trackLegacyRBACExemption } from './lib/track_legacy_rbac_exemption';
import { ConnectorTokenClient } from './lib/connector_token_client';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { Logger } from '@kbn/core/server';
import { connectorTokenClientMock } from './lib/connector_token_client.mock';
import { inMemoryMetricsMock } from './monitoring/in_memory_metrics.mock';
import { getOAuthJwtAccessToken } from './lib/get_oauth_jwt_access_token';
import { getOAuthClientCredentialsAccessToken } from './lib/get_oauth_client_credentials_access_token';
import { OAuthParams } from './routes/get_oauth_access_token';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { GetGlobalExecutionKPIParams, GetGlobalExecutionLogParams } from '../common';

jest.mock('@kbn/core-saved-objects-utils-server', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-utils-server');
  return {
    ...actual,
    SavedObjectsUtils: {
      generateId: () => 'mock-saved-object-id',
    },
  };
});

jest.mock('./lib/track_legacy_rbac_exemption', () => ({
  trackLegacyRBACExemption: jest.fn(),
}));

jest.mock('./authorization/get_authorization_mode_by_source', () => {
  return {
    getAuthorizationModeBySource: jest.fn(() => {
      return 1;
    }),
    getBulkAuthorizationModeBySource: jest.fn(() => {
      return 1;
    }),
    AuthorizationMode: {
      Legacy: 0,
      RBAC: 1,
    },
  };
});

jest.mock('./lib/get_oauth_jwt_access_token', () => ({
  getOAuthJwtAccessToken: jest.fn(),
}));
jest.mock('./lib/get_oauth_client_credentials_access_token', () => ({
  getOAuthClientCredentialsAccessToken: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: () => 'uuidv4',
}));

const defaultKibanaIndex = '.kibana';
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
const actionExecutor = actionExecutorMock.create();
const authorization = actionsAuthorizationMock.create();
const executionEnqueuer = jest.fn();
const ephemeralExecutionEnqueuer = jest.fn();
const bulkExecutionEnqueuer = jest.fn();
const request = httpServerMock.createKibanaRequest();
const auditLogger = auditLoggerMock.create();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const mockTaskManager = taskManagerMock.createSetup();
const configurationUtilities = actionsConfigMock.create();
const eventLogClient = eventLogClientMock.create();
const getEventLogClient = jest.fn();

let actionsClient: ActionsClient;
let mockedLicenseState: jest.Mocked<ILicenseState>;
let actionTypeRegistry: ActionTypeRegistry;
let actionTypeRegistryParams: ActionTypeRegistryOpts;
const executor: ExecutorType<{}, {}, {}, void> = async (options) => {
  return { status: 'ok', actionId: options.actionId };
};

const connectorTokenClient = connectorTokenClientMock.create();
const inMemoryMetrics = inMemoryMetricsMock.create();

beforeEach(() => {
  jest.resetAllMocks();
  mockedLicenseState = licenseStateMock.create();
  actionTypeRegistryParams = {
    licensing: licensingMock.createSetup(),
    taskManager: mockTaskManager,
    taskRunnerFactory: new TaskRunnerFactory(
      new ActionExecutor({ isESOCanEncrypt: true }),
      inMemoryMetrics
    ),
    actionsConfigUtils: actionsConfigMock.create(),
    licenseState: mockedLicenseState,
    preconfiguredActions: [],
  };
  actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
  actionsClient = new ActionsClient({
    logger,
    actionTypeRegistry,
    unsecuredSavedObjectsClient,
    scopedClusterClient,
    defaultKibanaIndex,
    preconfiguredActions: [],
    actionExecutor,
    executionEnqueuer,
    ephemeralExecutionEnqueuer,
    bulkExecutionEnqueuer,
    request,
    authorization: authorization as unknown as ActionsAuthorization,
    auditLogger,
    usageCounter: mockUsageCounter,
    connectorTokenClient,
    getEventLogClient,
  });
  (getOAuthJwtAccessToken as jest.Mock).mockResolvedValue(`Bearer jwttokentokentoken`);
  (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValue(
    `Bearer clienttokentokentoken`
  );
  getEventLogClient.mockResolvedValue(eventLogClient);
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
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
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
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
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

  describe('auditLogger', () => {
    test('logs audit event when creating a connector', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      actionTypeRegistry.register({
        id: savedObjectCreateResult.attributes.actionTypeId,
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        executor,
      });
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      await actionsClient.create({
        action: {
          ...savedObjectCreateResult.attributes,
          secrets: {},
        },
      });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_create',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: 'mock-saved-object-id', type: 'action' } },
        })
      );
    });

    test('logs audit event when not authorised to create a connector', async () => {
      const savedObjectCreateResult = {
        id: '1',
        type: 'action',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      };
      actionTypeRegistry.register({
        id: savedObjectCreateResult.attributes.actionTypeId,
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        executor,
      });
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce(savedObjectCreateResult);

      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        async () =>
          await actionsClient.create({
            action: {
              ...savedObjectCreateResult.attributes,
              secrets: {},
            },
          })
      ).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_create',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: 'mock-saved-object-id',
              type: 'action',
            },
          },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });
  });

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
      supportedFeatureIds: ['alerting'],
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
      isDeprecated: false,
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

  test('validates config', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: {
          schema: schema.object({
            param1: schema.string(),
          }),
        },
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

  test('validates connector: config and secrets', async () => {
    const connectorValidator = ({}, secrets: { param1: '1' }) => {
      if (secrets.param1 == null) {
        return '[param1] is required';
      }
      return null;
    };
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        connector: connectorValidator,
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
      `"error validating action type connector: [param1] is required"`
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
      supportedFeatureIds: ['alerting'],
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
      isDeprecated: false,
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

  test('throws error creating action with disabled actionType', async () => {
    const localConfigUtils = getActionsConfigurationUtilities({
      enabledActionTypes: ['some-not-ignored-action-type'],
      allowedHosts: ['*'],
      preconfiguredAlertHistoryEsIndex: false,
      preconfigured: {},
      proxyRejectUnauthorizedCertificates: true, // legacy
      rejectUnauthorized: true, // legacy
      proxyBypassHosts: undefined,
      proxyOnlyHosts: undefined,
      maxResponseContentLength: new ByteSizeValue(1000000),
      responseTimeout: moment.duration('60s'),
      cleanupFailedExecutionsTask: {
        enabled: true,
        cleanupInterval: schema.duration().validate('5m'),
        idleInterval: schema.duration().validate('1h'),
        pageSize: 100,
      },
      ssl: {
        verificationMode: 'full',
        proxyVerificationMode: 'full',
      },
    });

    const localActionTypeRegistryParams = {
      licensing: licensingMock.createSetup(),
      taskManager: mockTaskManager,
      taskRunnerFactory: new TaskRunnerFactory(
        new ActionExecutor({ isESOCanEncrypt: true }),
        inMemoryMetrics
      ),
      actionsConfigUtils: localConfigUtils,
      licenseState: licenseStateMock.create(),
      preconfiguredActions: [],
    };

    actionTypeRegistry = new ActionTypeRegistry(localActionTypeRegistryParams);
    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
      preconfiguredActions: [],
      actionExecutor,
      executionEnqueuer,
      ephemeralExecutionEnqueuer,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

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
      supportedFeatureIds: ['alerting'],
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
        isMissingSecrets: false,
        config: {},
      },
      references: [],
    };
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
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
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      });

      await actionsClient.get({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });

    test('ensures user is authorised to get preconfigured type of action', async () => {
      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        defaultKibanaIndex,
        actionExecutor,
        executionEnqueuer,
        ephemeralExecutionEnqueuer,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        preconfiguredActions: [
          {
            id: 'testPreconfigured',
            actionTypeId: 'my-action-type',
            secrets: {
              test: 'test1',
            },
            isPreconfigured: true,
            isDeprecated: false,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
      });

      await actionsClient.get({ id: 'testPreconfigured' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });

    test('throws when user is not authorised to get the type of action', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'type',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
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

    test('throws when user is not authorised to get preconfigured of action', async () => {
      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        defaultKibanaIndex,
        actionExecutor,
        executionEnqueuer,
        ephemeralExecutionEnqueuer,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        preconfiguredActions: [
          {
            id: 'testPreconfigured',
            actionTypeId: 'my-action-type',
            secrets: {
              test: 'test1',
            },
            isPreconfigured: true,
            isDeprecated: false,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
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

  describe('auditLogger', () => {
    test('logs audit event when getting a connector', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'type',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      });

      await actionsClient.get({ id: '1' });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_get',
            outcome: 'success',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
        })
      );
    });

    test('logs audit event when not authorised to get a connector', async () => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'type',
        attributes: {
          name: 'my name',
          actionTypeId: 'my-action-type',
          isMissingSecrets: false,
          config: {},
        },
        references: [],
      });

      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(actionsClient.get({ id: '1' })).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_get',
            outcome: 'failure',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
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
      isDeprecated: false,
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
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
      actionExecutor,
      executionEnqueuer,
      ephemeralExecutionEnqueuer,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      preconfiguredActions: [
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {
            test: 'test1',
          },
          isPreconfigured: true,
          isDeprecated: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });

    const result = await actionsClient.get({ id: 'testPreconfigured' });
    expect(result).toEqual({
      id: 'testPreconfigured',
      actionTypeId: '.slack',
      isPreconfigured: true,
      isDeprecated: false,
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
      scopedClusterClient.asInternalUser.search.mockResponse(
        // @ts-expect-error not full search response
        {
          aggregations: {
            '1': { doc_count: 6 },
            testPreconfigured: { doc_count: 2 },
          },
        }
      );

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        defaultKibanaIndex,
        actionExecutor,
        executionEnqueuer,
        ephemeralExecutionEnqueuer,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        preconfiguredActions: [
          {
            id: 'testPreconfigured',
            actionTypeId: '.slack',
            secrets: {},
            isPreconfigured: true,
            isDeprecated: false,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
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

  describe('auditLogger', () => {
    test('logs audit event when searching connectors', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
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
      });
      scopedClusterClient.asInternalUser.search.mockResponse(
        // @ts-expect-error not full search response
        {
          aggregations: {
            '1': { doc_count: 6 },
            testPreconfigured: { doc_count: 2 },
          },
        }
      );

      await actionsClient.getAll();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_find',
            outcome: 'success',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
        })
      );
    });

    test('logs audit event when not authorised to search connectors', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(actionsClient.getAll()).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_find',
            outcome: 'failure',
          }),
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
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
    scopedClusterClient.asInternalUser.search.mockResponse(
      // @ts-expect-error not full search response
      {
        aggregations: {
          '1': { doc_count: 6 },
          testPreconfigured: { doc_count: 2 },
        },
      }
    );

    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
      actionExecutor,
      executionEnqueuer,
      ephemeralExecutionEnqueuer,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      preconfiguredActions: [
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });
    const result = await actionsClient.getAll();
    expect(result).toEqual([
      {
        id: '1',
        isPreconfigured: false,
        isDeprecated: false,
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
        isDeprecated: false,
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
              isMissingSecrets: false,
            },
            references: [],
          },
        ],
      });
      scopedClusterClient.asInternalUser.search.mockResponse(
        // @ts-expect-error not full search response
        {
          aggregations: {
            '1': { doc_count: 6 },
            testPreconfigured: { doc_count: 2 },
          },
        }
      );

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        defaultKibanaIndex,
        actionExecutor,
        executionEnqueuer,
        ephemeralExecutionEnqueuer,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        preconfiguredActions: [
          {
            id: 'testPreconfigured',
            actionTypeId: '.slack',
            secrets: {},
            isPreconfigured: true,
            isDeprecated: false,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
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

  describe('auditLogger', () => {
    test('logs audit event when bulk getting connectors', async () => {
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
              isMissingSecrets: false,
            },
            references: [],
          },
        ],
      });
      scopedClusterClient.asInternalUser.search.mockResponse(
        // @ts-expect-error not full search response
        {
          aggregations: {
            '1': { doc_count: 6 },
            testPreconfigured: { doc_count: 2 },
          },
        }
      );

      await actionsClient.getBulk(['1']);

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_get',
            outcome: 'success',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
        })
      );
    });

    test('logs audit event when not authorised to bulk get connectors', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(actionsClient.getBulk(['1'])).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_get',
            outcome: 'failure',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
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
            isMissingSecrets: false,
          },
          references: [],
        },
      ],
    });
    scopedClusterClient.asInternalUser.search.mockResponse(
      // @ts-expect-error not full search response
      {
        aggregations: {
          '1': { doc_count: 6 },
          testPreconfigured: { doc_count: 2 },
        },
      }
    );

    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
      actionExecutor,
      executionEnqueuer,
      ephemeralExecutionEnqueuer,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      preconfiguredActions: [
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
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
        isDeprecated: false,
        name: 'test',
        secrets: {},
      },
      {
        actionTypeId: 'test',
        config: {
          foo: 'bar',
        },
        id: '1',
        isMissingSecrets: false,
        isPreconfigured: false,
        isDeprecated: false,
        name: 'test',
      },
    ]);
  });
});

describe('getOAuthAccessToken()', () => {
  function getOAuthAccessToken(
    requestBody: OAuthParams
  ): ReturnType<ActionsClient['getOAuthAccessToken']> {
    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
      actionExecutor,
      executionEnqueuer,
      ephemeralExecutionEnqueuer,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      preconfiguredActions: [
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
      connectorTokenClient: connectorTokenClientMock.create(),
      getEventLogClient,
    });
    return actionsClient.getOAuthAccessToken(requestBody, configurationUtilities);
  }

  describe('authorization', () => {
    test('ensures user is authorised to get the type of action', async () => {
      await getOAuthAccessToken({
        type: 'jwt',
        options: {
          tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
          config: {
            clientId: 'abc',
            jwtKeyId: 'def',
            userIdentifierValue: 'userA',
          },
          secrets: {
            clientSecret: 'iamasecret',
            privateKey: 'xyz',
          },
        },
      });
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('update');
    });

    test('throws when user is not authorised to create the type of action', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error(`Unauthorized to update actions`));

      await expect(
        getOAuthAccessToken({
          type: 'jwt',
          options: {
            tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
            config: {
              clientId: 'abc',
              jwtKeyId: 'def',
              userIdentifierValue: 'userA',
            },
            secrets: {
              clientSecret: 'iamasecret',
              privateKey: 'xyz',
            },
          },
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to update actions]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('update');
    });
  });

  test('throws when tokenUrl is not using http or https', async () => {
    await expect(
      getOAuthAccessToken({
        type: 'jwt',
        options: {
          tokenUrl: 'ftp://testurl.service-now.com/oauth_token.do',
          config: {
            clientId: 'abc',
            jwtKeyId: 'def',
            userIdentifierValue: 'userA',
          },
          secrets: {
            clientSecret: 'iamasecret',
            privateKey: 'xyz',
          },
        },
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Token URL must use http or https]`);

    expect(authorization.ensureAuthorized).toHaveBeenCalledWith('update');
  });

  test('throws when tokenUrl does not contain hostname', async () => {
    await expect(
      getOAuthAccessToken({
        type: 'jwt',
        options: {
          tokenUrl: '/path/to/myfile',
          config: {
            clientId: 'abc',
            jwtKeyId: 'def',
            userIdentifierValue: 'userA',
          },
          secrets: {
            clientSecret: 'iamasecret',
            privateKey: 'xyz',
          },
        },
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Token URL must contain hostname]`);

    expect(authorization.ensureAuthorized).toHaveBeenCalledWith('update');
  });

  test('throws when tokenUrl is not in allowed hosts', async () => {
    configurationUtilities.ensureUriAllowed.mockImplementationOnce(() => {
      throw new Error('URI not allowed');
    });

    await expect(
      getOAuthAccessToken({
        type: 'jwt',
        options: {
          tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
          config: {
            clientId: 'abc',
            jwtKeyId: 'def',
            userIdentifierValue: 'userA',
          },
          secrets: {
            clientSecret: 'iamasecret',
            privateKey: 'xyz',
          },
        },
      })
    ).rejects.toMatchInlineSnapshot(`[Error: URI not allowed]`);

    expect(authorization.ensureAuthorized).toHaveBeenCalledWith('update');
    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
      `https://testurl.service-now.com/oauth_token.do`
    );
  });

  test('calls getOAuthJwtAccessToken when type="jwt"', async () => {
    const result = await getOAuthAccessToken({
      type: 'jwt',
      options: {
        tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
        config: {
          clientId: 'abc',
          jwtKeyId: 'def',
          userIdentifierValue: 'userA',
        },
        secrets: {
          clientSecret: 'iamasecret',
          privateKey: 'xyz',
        },
      },
    });
    expect(result).toEqual({
      accessToken: 'Bearer jwttokentokentoken',
    });
    expect(getOAuthJwtAccessToken as jest.Mock).toHaveBeenCalledWith({
      logger,
      configurationUtilities,
      credentials: {
        config: {
          clientId: 'abc',
          jwtKeyId: 'def',
          userIdentifierValue: 'userA',
        },
        secrets: {
          clientSecret: 'iamasecret',
          privateKey: 'xyz',
        },
      },
      tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
    });
    expect(getOAuthClientCredentialsAccessToken).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      `Successfully retrieved access token using JWT OAuth with tokenUrl https://testurl.service-now.com/oauth_token.do and config {\"clientId\":\"abc\",\"jwtKeyId\":\"def\",\"userIdentifierValue\":\"userA\"}`
    );
  });

  test('calls getOAuthClientCredentialsAccessToken when type="client"', async () => {
    const result = await getOAuthAccessToken({
      type: 'client',
      options: {
        tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
        scope: 'https://graph.microsoft.com/.default',
        config: {
          clientId: 'abc',
          tenantId: 'def',
        },
        secrets: {
          clientSecret: 'iamasecret',
        },
      },
    });
    expect(result).toEqual({
      accessToken: 'Bearer clienttokentokentoken',
    });
    expect(getOAuthClientCredentialsAccessToken as jest.Mock).toHaveBeenCalledWith({
      logger,
      configurationUtilities,
      credentials: {
        config: {
          clientId: 'abc',
          tenantId: 'def',
        },
        secrets: {
          clientSecret: 'iamasecret',
        },
      },
      tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
      oAuthScope: 'https://graph.microsoft.com/.default',
    });
    expect(getOAuthJwtAccessToken).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      `Successfully retrieved access token using Client Credentials OAuth with tokenUrl https://login.microsoftonline.com/98765/oauth2/v2.0/token, scope https://graph.microsoft.com/.default and config {\"clientId\":\"abc\",\"tenantId\":\"def\"}`
    );
  });

  test('throws when getOAuthJwtAccessToken throws error', async () => {
    (getOAuthJwtAccessToken as jest.Mock).mockRejectedValue(new Error(`Something went wrong!`));

    await expect(
      getOAuthAccessToken({
        type: 'jwt',
        options: {
          tokenUrl: 'https://testurl.service-now.com/oauth_token.do',
          config: {
            clientId: 'abc',
            jwtKeyId: 'def',
            userIdentifierValue: 'userA',
          },
          secrets: {
            clientSecret: 'iamasecret',
            privateKey: 'xyz',
          },
        },
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Failed to retrieve access token]`);

    expect(getOAuthJwtAccessToken as jest.Mock).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      `Failed to retrieve access token using JWT OAuth with tokenUrl https://testurl.service-now.com/oauth_token.do and config {\"clientId\":\"abc\",\"jwtKeyId\":\"def\",\"userIdentifierValue\":\"userA\"} - Something went wrong!`
    );
  });

  test('throws when getOAuthClientCredentialsAccessToken throws error', async () => {
    (getOAuthClientCredentialsAccessToken as jest.Mock).mockRejectedValue(
      new Error(`Something went wrong!`)
    );

    await expect(
      getOAuthAccessToken({
        type: 'client',
        options: {
          tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
          scope: 'https://graph.microsoft.com/.default',
          config: {
            clientId: 'abc',
            tenantId: 'def',
          },
          secrets: {
            clientSecret: 'iamasecret',
          },
        },
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Failed to retrieve access token]`);

    expect(getOAuthClientCredentialsAccessToken as jest.Mock).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      `Failed to retrieved access token using Client Credentials OAuth with tokenUrl https://login.microsoftonline.com/98765/oauth2/v2.0/token, scope https://graph.microsoft.com/.default and config {\"clientId\":\"abc\",\"tenantId\":\"def\"} - Something went wrong!`
    );
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

    test(`deletes any existing authorization tokens`, async () => {
      await actionsClient.delete({ id: '1' });
      expect(connectorTokenClient.deleteConnectorTokens).toHaveBeenCalledTimes(1);
    });

    test(`failing to delete tokens logs error instead of throw`, async () => {
      connectorTokenClient.deleteConnectorTokens.mockRejectedValueOnce(new Error('Fail'));
      await expect(actionsClient.delete({ id: '1' })).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to delete auth tokens for connector "1" after delete: Fail`
      );
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when deleting a connector', async () => {
      await actionsClient.delete({ id: '1' });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_delete',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
        })
      );
    });

    test('logs audit event when not authorised to delete a connector', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(actionsClient.delete({ id: '1' })).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_delete',
            outcome: 'failure',
          }),
          kibana: { saved_object: { id: '1', type: 'action' } },
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
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
  function updateOperation(): ReturnType<ActionsClient['update']> {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
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
    return actionsClient.update({
      id: 'my-action',
      action: {
        name: 'my name',
        config: {},
        secrets: {},
      },
    });
  }

  describe('authorization', () => {
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

    test(`deletes any existing authorization tokens`, async () => {
      await updateOperation();
      expect(connectorTokenClient.deleteConnectorTokens).toHaveBeenCalledTimes(1);
    });

    test(`failing to delete tokens logs error instead of throw`, async () => {
      connectorTokenClient.deleteConnectorTokens.mockRejectedValueOnce(new Error('Fail'));
      await expect(updateOperation()).resolves.toBeTruthy();
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to delete auth tokens for connector "my-action" after update: Fail`
      );
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when updating a connector', async () => {
      await updateOperation();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_update',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: 'my-action', type: 'action' } },
        })
      );
    });

    test('logs audit event when not authorised to update a connector', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(updateOperation()).rejects.toThrow();

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'connector_update',
            outcome: 'failure',
          }),
          kibana: { saved_object: { id: 'my-action', type: 'action' } },
          error: { code: 'Error', message: 'Unauthorized' },
        })
      );
    });
  });

  test('updates an action with all given properties', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
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
      isDeprecated: false,
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

  test('updates an action with isMissingSecrets "true" (set true as the import result), to isMissingSecrets', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      executor,
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'action',
      attributes: {
        actionTypeId: 'my-action-type',
        isMissingSecrets: true,
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
      isDeprecated: false,
      actionTypeId: 'my-action-type',
      isMissingSecrets: true,
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
  });

  test('validates config', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: {
          schema: schema.object({
            param1: schema.string(),
          }),
        },
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

  test('validates connector: config and secrets', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        connector: () => {
          return '[param1] is required';
        },
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
      `"error validating action type connector: [param1] is required"`
    );
  });

  test('encrypts action type options unless specified not to', async () => {
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
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
      isDeprecated: false,
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
      supportedFeatureIds: ['alerting'],
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

describe('execute()', () => {
  describe('authorization', () => {
    test('ensures user is authorised to excecute actions', async () => {
      (getAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return AuthorizationMode.RBAC;
      });
      await actionsClient.execute({
        actionId: 'action-id',
        params: {
          name: 'my name',
        },
      });
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });

    test('throws when user is not authorised to create the type of action', async () => {
      (getAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return AuthorizationMode.RBAC;
      });
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

    test('tracks legacy RBAC', async () => {
      (getAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return AuthorizationMode.Legacy;
      });

      await actionsClient.execute({
        actionId: 'action-id',
        params: {
          name: 'my name',
        },
      });

      expect(trackLegacyRBACExemption as jest.Mock).toBeCalledWith('execute', mockUsageCounter);
    });
  });

  test('calls the actionExecutor with the appropriate parameters', async () => {
    const actionId = uuid.v4();
    const actionExecutionId = uuid.v4();
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
      actionExecutionId,
    });

    await expect(
      actionsClient.execute({
        actionId,
        params: {
          name: 'my name',
        },
        relatedSavedObjects: [
          {
            id: 'some-id',
            typeId: 'some-type-id',
            type: 'some-type',
          },
        ],
      })
    ).resolves.toMatchObject({ status: 'ok', actionId });

    expect(actionExecutor.execute).toHaveBeenCalledWith({
      actionId,
      request,
      params: {
        name: 'my name',
      },
      relatedSavedObjects: [
        {
          id: 'some-id',
          typeId: 'some-type-id',
          type: 'some-type',
        },
      ],
      actionExecutionId,
    });

    await expect(
      actionsClient.execute({
        actionId,
        params: {
          name: 'my name',
        },
        relatedSavedObjects: [
          {
            id: 'some-id',
            typeId: 'some-type-id',
            type: 'some-type',
            namespace: 'some-namespace',
          },
        ],
      })
    ).resolves.toMatchObject({ status: 'ok', actionId });

    expect(actionExecutor.execute).toHaveBeenCalledWith({
      actionId,
      request,
      params: {
        name: 'my name',
      },
      relatedSavedObjects: [
        {
          id: 'some-id',
          typeId: 'some-type-id',
          type: 'some-type',
          namespace: 'some-namespace',
        },
      ],
      actionExecutionId,
    });
  });
});

describe('enqueueExecution()', () => {
  describe('authorization', () => {
    test('ensures user is authorised to excecute actions', async () => {
      (getAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return AuthorizationMode.RBAC;
      });
      await actionsClient.enqueueExecution({
        id: uuid.v4(),
        params: {},
        spaceId: 'default',
        executionId: '123abc',
        apiKey: null,
      });
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });

    test('throws when user is not authorised to create the type of action', async () => {
      (getAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return AuthorizationMode.RBAC;
      });
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to execute all actions`)
      );

      await expect(
        actionsClient.enqueueExecution({
          id: uuid.v4(),
          params: {},
          spaceId: 'default',
          executionId: '123abc',
          apiKey: null,
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to execute all actions]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });

    test('tracks legacy RBAC', async () => {
      (getAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return AuthorizationMode.Legacy;
      });

      await actionsClient.enqueueExecution({
        id: uuid.v4(),
        params: {},
        spaceId: 'default',
        executionId: '123abc',
        apiKey: null,
      });

      expect(trackLegacyRBACExemption as jest.Mock).toBeCalledWith(
        'enqueueExecution',
        mockUsageCounter
      );
    });
  });

  test('calls the executionEnqueuer with the appropriate parameters', async () => {
    const opts = {
      id: uuid.v4(),
      params: { baz: false },
      spaceId: 'default',
      executionId: '123abc',
      apiKey: Buffer.from('123:abc').toString('base64'),
    };
    await expect(actionsClient.enqueueExecution(opts)).resolves.toMatchInlineSnapshot(`undefined`);

    expect(executionEnqueuer).toHaveBeenCalledWith(unsecuredSavedObjectsClient, opts);
  });
});

describe('bulkEnqueueExecution()', () => {
  describe('authorization', () => {
    test('ensures user is authorised to excecute actions', async () => {
      (getBulkAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return { [AuthorizationMode.RBAC]: 1, [AuthorizationMode.Legacy]: 0 };
      });
      await actionsClient.bulkEnqueueExecution([
        {
          id: uuid.v4(),
          params: {},
          spaceId: 'default',
          executionId: '123abc',
          apiKey: null,
        },
        {
          id: uuid.v4(),
          params: {},
          spaceId: 'default',
          executionId: '456def',
          apiKey: null,
        },
      ]);
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });

    test('throws when user is not authorised to create the type of action', async () => {
      (getBulkAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return { [AuthorizationMode.RBAC]: 1, [AuthorizationMode.Legacy]: 0 };
      });
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to execute all actions`)
      );

      await expect(
        actionsClient.bulkEnqueueExecution([
          {
            id: uuid.v4(),
            params: {},
            spaceId: 'default',
            executionId: '123abc',
            apiKey: null,
          },
          {
            id: uuid.v4(),
            params: {},
            spaceId: 'default',
            executionId: '456def',
            apiKey: null,
          },
        ])
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to execute all actions]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });

    test('tracks legacy RBAC', async () => {
      (getBulkAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return { [AuthorizationMode.RBAC]: 0, [AuthorizationMode.Legacy]: 2 };
      });

      await actionsClient.bulkEnqueueExecution([
        {
          id: uuid.v4(),
          params: {},
          spaceId: 'default',
          executionId: '123abc',
          apiKey: null,
        },
        {
          id: uuid.v4(),
          params: {},
          spaceId: 'default',
          executionId: '456def',
          apiKey: null,
        },
      ]);

      expect(trackLegacyRBACExemption as jest.Mock).toBeCalledWith(
        'bulkEnqueueExecution',
        mockUsageCounter,
        2
      );
    });
  });

  test('calls the bulkExecutionEnqueuer with the appropriate parameters', async () => {
    (getBulkAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
      return { [AuthorizationMode.RBAC]: 0, [AuthorizationMode.Legacy]: 0 };
    });
    const opts = [
      {
        id: uuid.v4(),
        params: {},
        spaceId: 'default',
        executionId: '123abc',
        apiKey: null,
      },
      {
        id: uuid.v4(),
        params: {},
        spaceId: 'default',
        executionId: '456def',
        apiKey: null,
      },
    ];
    await expect(actionsClient.bulkEnqueueExecution(opts)).resolves.toMatchInlineSnapshot(
      `undefined`
    );

    expect(bulkExecutionEnqueuer).toHaveBeenCalledWith(unsecuredSavedObjectsClient, opts);
  });
});

describe('isActionTypeEnabled()', () => {
  const fooActionType: ActionType = {
    id: 'foo',
    name: 'Foo',
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: ['alerting'],
    executor: jest.fn(),
  };
  beforeEach(() => {
    actionTypeRegistry.register(fooActionType);
  });

  test('should call isLicenseValidForActionType of the license state with notifyUsage false by default', () => {
    mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
    actionsClient.isActionTypeEnabled('foo');
    expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalledWith(fooActionType, {
      notifyUsage: false,
    });
  });

  test('should call isLicenseValidForActionType of the license state with notifyUsage true when specified', () => {
    mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
    actionsClient.isActionTypeEnabled('foo', { notifyUsage: true });
    expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalledWith(fooActionType, {
      notifyUsage: true,
    });
  });
});

describe('isPreconfigured()', () => {
  test('should return true if connector id is in list of preconfigured connectors', () => {
    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
      actionExecutor,
      executionEnqueuer,
      ephemeralExecutionEnqueuer,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      preconfiguredActions: [
        {
          id: 'testPreconfigured',
          actionTypeId: 'my-action-type',
          secrets: {
            test: 'test1',
          },
          isPreconfigured: true,
          isDeprecated: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
      connectorTokenClient: new ConnectorTokenClient({
        unsecuredSavedObjectsClient: savedObjectsClientMock.create(),
        encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
        logger,
      }),
      getEventLogClient,
    });

    expect(actionsClient.isPreconfigured('testPreconfigured')).toEqual(true);
  });

  test('should return false if connector id is not in list of preconfigured connectors', () => {
    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      defaultKibanaIndex,
      actionExecutor,
      executionEnqueuer,
      ephemeralExecutionEnqueuer,
      bulkExecutionEnqueuer,
      request,
      authorization: authorization as unknown as ActionsAuthorization,
      preconfiguredActions: [
        {
          id: 'testPreconfigured',
          actionTypeId: 'my-action-type',
          secrets: {
            test: 'test1',
          },
          isPreconfigured: true,
          isDeprecated: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
      connectorTokenClient: new ConnectorTokenClient({
        unsecuredSavedObjectsClient: savedObjectsClientMock.create(),
        encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
        logger,
      }),
      getEventLogClient,
    });

    expect(actionsClient.isPreconfigured(uuid.v4())).toEqual(false);
  });
});

describe('getGlobalExecutionLogWithAuth()', () => {
  const opts: GetGlobalExecutionLogParams = {
    dateStart: '2023-01-09T08:55:56-08:00',
    dateEnd: '2023-01-10T08:55:56-08:00',
    page: 1,
    perPage: 50,
    sort: [{ timestamp: { order: 'desc' } }],
  };
  const results = {
    aggregations: {
      executionLogAgg: {
        doc_count: 5,
        executionUuid: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [],
        },
        executionUuidCardinality: { doc_count: 5, executionUuidCardinality: { value: 5 } },
      },
    },
  };
  describe('authorization', () => {
    test('ensures user is authorised to access logs', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue(results);

      (getAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return AuthorizationMode.RBAC;
      });
      await actionsClient.getGlobalExecutionLogWithAuth(opts);
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });

    test('throws when user is not authorised to access logs', async () => {
      (getAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return AuthorizationMode.RBAC;
      });
      authorization.ensureAuthorized.mockRejectedValue(new Error(`Unauthorized to access logs`));

      await expect(actionsClient.getGlobalExecutionLogWithAuth(opts)).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to access logs]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });
  });

  test('calls the eventLogClient with the appropriate parameters', async () => {
    eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue(results);

    await expect(actionsClient.getGlobalExecutionLogWithAuth(opts)).resolves.toMatchInlineSnapshot(`
      Object {
        "data": Array [],
        "total": 5,
      }
    `);
    expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalled();
  });
});

describe('getGlobalExecutionKpiWithAuth()', () => {
  const opts: GetGlobalExecutionKPIParams = {
    dateStart: '2023-01-09T08:55:56-08:00',
    dateEnd: '2023-01-10T08:55:56-08:00',
  };
  const results = {
    aggregations: {
      executionKpiAgg: {
        doc_count: 5,
        executionUuid: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [],
        },
      },
    },
  };
  describe('authorization', () => {
    test('ensures user is authorised to access kpi', async () => {
      eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue(results);

      (getAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return AuthorizationMode.RBAC;
      });
      await actionsClient.getGlobalExecutionKpiWithAuth(opts);
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });

    test('throws when user is not authorised to access kpi', async () => {
      (getAuthorizationModeBySource as jest.Mock).mockImplementationOnce(() => {
        return AuthorizationMode.RBAC;
      });
      authorization.ensureAuthorized.mockRejectedValue(new Error(`Unauthorized to access kpi`));

      await expect(actionsClient.getGlobalExecutionKpiWithAuth(opts)).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to access kpi]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('get');
    });
  });

  test('calls the eventLogClient with the appropriate parameters', async () => {
    eventLogClient.aggregateEventsWithAuthFilter.mockResolvedValue(results);

    await expect(actionsClient.getGlobalExecutionKpiWithAuth(opts)).resolves.toMatchInlineSnapshot(`
      Object {
        "failure": 0,
        "success": 0,
        "unknown": 0,
        "warning": 0,
      }
    `);
    expect(eventLogClient.aggregateEventsWithAuthFilter).toHaveBeenCalled();
  });
});
