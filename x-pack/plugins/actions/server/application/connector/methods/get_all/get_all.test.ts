/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '../../../../actions_client';
import { ActionsAuthorization } from '../../../../authorization/actions_authorization';
import { connectorTokenClientMock } from '../../../../lib/connector_token_client.mock';
import { getOAuthJwtAccessToken } from '../../../../lib/get_oauth_jwt_access_token';
import { getOAuthClientCredentialsAccessToken } from '../../../../lib/get_oauth_client_credentials_access_token';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { actionsAuthorizationMock } from '../../../../authorization/actions_authorization.mock';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { actionExecutorMock } from '../../../../lib/action_executor.mock';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { Logger } from '@kbn/logging';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { ActionTypeRegistry } from '../../../../action_type_registry';
import { getAllUnsecured } from './get_all';

jest.mock('@kbn/core-saved-objects-utils-server', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-utils-server');
  return {
    ...actual,
    SavedObjectsUtils: {
      generateId: () => 'mock-saved-object-id',
    },
  };
});

jest.mock('../../../../lib/track_legacy_rbac_exemption', () => ({
  trackLegacyRBACExemption: jest.fn(),
}));

jest.mock('../../../../authorization/get_authorization_mode_by_source', () => {
  return {
    getAuthorizationModeBySource: jest.fn(() => {
      return 1;
    }),
    bulkGetAuthorizationModeBySource: jest.fn(() => {
      return 1;
    }),
    AuthorizationMode: {
      Legacy: 0,
      RBAC: 1,
    },
  };
});

jest.mock('../../../../lib/get_oauth_jwt_access_token', () => ({
  getOAuthJwtAccessToken: jest.fn(),
}));
jest.mock('../../../../lib/get_oauth_client_credentials_access_token', () => ({
  getOAuthClientCredentialsAccessToken: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: () => 'uuidv4',
}));

const kibanaIndices = ['.kibana'];
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
const actionExecutor = actionExecutorMock.create();
const authorization = actionsAuthorizationMock.create();
const ephemeralExecutionEnqueuer = jest.fn();
const bulkExecutionEnqueuer = jest.fn();
const request = httpServerMock.createKibanaRequest();
const auditLogger = auditLoggerMock.create();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const eventLogClient = eventLogClientMock.create();
const getEventLogClient = jest.fn();
const connectorTokenClient = connectorTokenClientMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

let actionsClient: ActionsClient;
let actionTypeRegistry: ActionTypeRegistry;

describe('getAll()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    actionsClient = new ActionsClient({
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      kibanaIndices,
      inMemoryConnectors: [],
      actionExecutor,
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
          kibanaIndices,
          actionExecutor,
          ephemeralExecutionEnqueuer,
          bulkExecutionEnqueuer,
          request,
          authorization: authorization as unknown as ActionsAuthorization,
          inMemoryConnectors: [
            {
              id: 'testPreconfigured',
              actionTypeId: '.slack',
              secrets: {},
              isPreconfigured: true,
              isDeprecated: false,
              isSystemAction: false,
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
        expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
      });

      test('throws when user is not authorised to create the type of action', async () => {
        authorization.ensureAuthorized.mockRejectedValue(
          new Error(`Unauthorized to get all actions`)
        );

        await expect(getAllOperation()).rejects.toMatchInlineSnapshot(
          `[Error: Unauthorized to get all actions]`
        );

        expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
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

    test('calls unsecuredSavedObjectsClient with parameters and returns inMemoryConnectors correctly', async () => {
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
            'system-connector-.cases': { doc_count: 2 },
          },
        }
      );

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        ephemeralExecutionEnqueuer,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        inMemoryConnectors: [
          {
            id: 'testPreconfigured',
            actionTypeId: '.slack',
            secrets: {},
            isPreconfigured: true,
            isDeprecated: false,
            isSystemAction: false,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
          /**
           * System actions will not
           * be returned from getAll
           * if no options are provided
           */
          {
            id: 'system-connector-.cases',
            actionTypeId: '.cases',
            name: 'System action: .cases',
            config: {},
            secrets: {},
            isDeprecated: false,
            isMissingSecrets: false,
            isPreconfigured: false,
            isSystemAction: true,
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
      });

      const result = await actionsClient.getAll();

      expect(result).toEqual([
        {
          id: '1',
          name: 'test',
          isMissingSecrets: false,
          config: { foo: 'bar' },
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 6,
        },
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          name: 'test',
          isPreconfigured: true,
          isSystemAction: false,
          isDeprecated: false,
          referencedByCount: 2,
        },
      ]);
    });

    test('get system actions correctly', async () => {
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
            'system-connector-.cases': { doc_count: 2 },
          },
        }
      );

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        ephemeralExecutionEnqueuer,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        inMemoryConnectors: [
          {
            id: 'testPreconfigured',
            actionTypeId: '.slack',
            secrets: {},
            isPreconfigured: true,
            isDeprecated: false,
            isSystemAction: false,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
          {
            id: 'system-connector-.cases',
            actionTypeId: '.cases',
            name: 'System action: .cases',
            config: {},
            secrets: {},
            isDeprecated: false,
            isMissingSecrets: false,
            isPreconfigured: false,
            isSystemAction: true,
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
      });

      const result = await actionsClient.getAll({ includeSystemActions: true });

      expect(result).toEqual([
        {
          actionTypeId: '.cases',
          id: 'system-connector-.cases',
          isDeprecated: false,
          isPreconfigured: false,
          isSystemAction: true,
          name: 'System action: .cases',
          referencedByCount: 2,
        },
        {
          id: '1',
          name: 'test',
          isMissingSecrets: false,
          config: { foo: 'bar' },
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: false,
          referencedByCount: 6,
        },
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          name: 'test',
          isPreconfigured: true,
          isSystemAction: false,
          isDeprecated: false,
          referencedByCount: 2,
        },
      ]);
    });

    test('validates connectors before return', async () => {
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

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        ephemeralExecutionEnqueuer,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        inMemoryConnectors: [
          {
            id: 'testPreconfigured',
            actionTypeId: '.slack',
            secrets: {},
            isPreconfigured: true,
            isDeprecated: false,
            isSystemAction: false,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
      });

      const result = await actionsClient.getAll({ includeSystemActions: true });
      expect(result).toEqual([
        {
          config: {
            foo: 'bar',
          },
          id: '1',
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: false,
          name: 'test',
          referencedByCount: 6,
        },
        {
          actionTypeId: '.slack',
          id: 'testPreconfigured',
          isDeprecated: false,
          isPreconfigured: true,
          isSystemAction: false,
          name: 'test',
          referencedByCount: 2,
        },
      ]);

      expect(logger.warn).toHaveBeenCalledWith(
        'Error validating connector: 1, Error: [actionTypeId]: expected value of type [string] but got [undefined]'
      );
    });

    test('removes secrets before validation', async () => {
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
              actionTypeId: 'test',
              isMissingSecrets: false,
              config: {
                foo: 'bar',
              },
              secrets: { foo: 'bar' },
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
          },
        }
      );

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        ephemeralExecutionEnqueuer,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        inMemoryConnectors: [],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
      });

      await actionsClient.getAll();

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('getAllSystemConnectors()', () => {
    describe('authorization', () => {
      function getAllOperation(): ReturnType<ActionsClient['getAll']> {
        scopedClusterClient.asInternalUser.search.mockResponse(
          // @ts-expect-error not full search response
          {
            aggregations: {
              'system-connector-.test': { doc_count: 2 },
            },
          }
        );

        actionsClient = new ActionsClient({
          logger,
          actionTypeRegistry,
          unsecuredSavedObjectsClient,
          scopedClusterClient,
          kibanaIndices,
          actionExecutor,
          ephemeralExecutionEnqueuer,
          bulkExecutionEnqueuer,
          request,
          authorization: authorization as unknown as ActionsAuthorization,
          inMemoryConnectors: [
            {
              id: 'system-connector-.test',
              actionTypeId: '.test',
              name: 'Test system action',
              config: {},
              secrets: {},
              isDeprecated: false,
              isMissingSecrets: false,
              isPreconfigured: false,
              isSystemAction: true,
            },
          ],
          connectorTokenClient: connectorTokenClientMock.create(),
          getEventLogClient,
        });

        return actionsClient.getAllSystemConnectors();
      }

      test('ensures user is authorised to get the type of action', async () => {
        await getAllOperation();
        expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
      });

      test('throws when user is not authorised to get the type of action', async () => {
        authorization.ensureAuthorized.mockRejectedValue(
          new Error(`Unauthorized to get all actions`)
        );

        await expect(getAllOperation()).rejects.toMatchInlineSnapshot(
          `[Error: Unauthorized to get all actions]`
        );

        expect(authorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'get' });
      });
    });

    describe('auditLogger', () => {
      test('logs audit event when not authorised to search connectors', async () => {
        authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

        await expect(actionsClient.getAllSystemConnectors()).rejects.toThrow();

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

    test('get all system actions correctly', async () => {
      scopedClusterClient.asInternalUser.search.mockResponse(
        // @ts-expect-error not full search response
        {
          aggregations: {
            'system-connector-.test': { doc_count: 2 },
          },
        }
      );

      actionsClient = new ActionsClient({
        logger,
        actionTypeRegistry,
        unsecuredSavedObjectsClient,
        scopedClusterClient,
        kibanaIndices,
        actionExecutor,
        ephemeralExecutionEnqueuer,
        bulkExecutionEnqueuer,
        request,
        authorization: authorization as unknown as ActionsAuthorization,
        inMemoryConnectors: [
          {
            id: 'testPreconfigured',
            actionTypeId: 'my-action-type',
            secrets: {
              test: 'test1',
            },
            isPreconfigured: true,
            isDeprecated: false,
            isSystemAction: false,
            name: 'test',
            config: {
              foo: 'bar',
            },
          },
          {
            id: 'system-connector-.test',
            actionTypeId: '.test',
            name: 'Test system action',
            config: {},
            secrets: {},
            isDeprecated: false,
            isMissingSecrets: false,
            isPreconfigured: false,
            isSystemAction: true,
          },
        ],
        connectorTokenClient: connectorTokenClientMock.create(),
        getEventLogClient,
      });

      const result = await actionsClient.getAllSystemConnectors();

      expect(result).toEqual([
        {
          id: 'system-connector-.test',
          actionTypeId: '.test',
          name: 'Test system action',
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
          referencedByCount: 2,
        },
      ]);
    });
  });
});

describe('getAllUnsecured()', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test('calls internalSavedObjectRepository with parameters and returns inMemoryConnectors correctly', async () => {
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
            secrets: 'this should not be returned',
          },
          score: 1,
          references: [],
        },
      ],
    };
    internalSavedObjectsRepository.find.mockResolvedValueOnce(expectedResult);
    scopedClusterClient.asInternalUser.search.mockResponse(
      // @ts-expect-error not full search response
      {
        aggregations: {
          '1': { doc_count: 6 },
          testPreconfigured: { doc_count: 2 },
          'system-connector-.cases': { doc_count: 2 },
        },
      }
    );

    const result = await getAllUnsecured({
      esClient: scopedClusterClient.asInternalUser,
      inMemoryConnectors: [
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
        /**
         * System actions will not
         * be returned from getAllUnsecured
         */
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      internalSavedObjectsRepository,
      kibanaIndices,
      logger,
      spaceId: 'default',
    });

    expect(result).toEqual([
      {
        id: '1',
        name: 'test',
        isMissingSecrets: false,
        config: { foo: 'bar' },
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
        referencedByCount: 6,
      },
      {
        id: 'testPreconfigured',
        actionTypeId: '.slack',
        name: 'test',
        isPreconfigured: true,
        isSystemAction: false,
        isDeprecated: false,
        referencedByCount: 2,
      },
    ]);

    expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
      perPage: 10000,
      type: 'action',
    });

    expect(scopedClusterClient.asInternalUser.search).toHaveBeenCalledWith({
      index: kibanaIndices,
      ignore_unavailable: true,
      body: {
        aggs: {
          '1': {
            filter: {
              bool: {
                must: {
                  nested: {
                    path: 'references',
                    query: {
                      bool: {
                        filter: {
                          bool: {
                            must: [
                              {
                                term: {
                                  'references.id': '1',
                                },
                              },
                              {
                                term: {
                                  'references.type': 'action',
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          testPreconfigured: {
            filter: {
              bool: {
                must: {
                  nested: {
                    path: 'references',
                    query: {
                      bool: {
                        filter: {
                          bool: {
                            must: [
                              {
                                term: {
                                  'references.id': 'testPreconfigured',
                                },
                              },
                              {
                                term: {
                                  'references.type': 'action',
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        size: 0,
        query: {
          match_all: {},
        },
      },
    });

    expect(auditLogger.log).not.toHaveBeenCalled();
    expect(authorization.ensureAuthorized).not.toHaveBeenCalled();
  });

  test('passed custom space id if defined', async () => {
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
            secrets: 'this should not be returned',
          },
          score: 1,
          references: [],
        },
      ],
    };
    internalSavedObjectsRepository.find.mockResolvedValueOnce(expectedResult);
    scopedClusterClient.asInternalUser.search.mockResponse(
      // @ts-expect-error not full search response
      {
        aggregations: {
          '1': { doc_count: 6 },
          testPreconfigured: { doc_count: 2 },
          'system-connector-.cases': { doc_count: 2 },
        },
      }
    );

    const result = await getAllUnsecured({
      esClient: scopedClusterClient.asInternalUser,
      inMemoryConnectors: [
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
        /**
         * System actions will not
         * be returned from getAllUnsecured
         */
        {
          id: 'system-connector-.cases',
          actionTypeId: '.cases',
          name: 'System action: .cases',
          config: {},
          secrets: {},
          isDeprecated: false,
          isMissingSecrets: false,
          isPreconfigured: false,
          isSystemAction: true,
        },
      ],
      internalSavedObjectsRepository,
      kibanaIndices,
      logger,
      spaceId: 'custom',
    });

    expect(result).toEqual([
      {
        id: '1',
        name: 'test',
        isMissingSecrets: false,
        config: { foo: 'bar' },
        isPreconfigured: false,
        isDeprecated: false,
        isSystemAction: false,
        referencedByCount: 6,
      },
      {
        id: 'testPreconfigured',
        actionTypeId: '.slack',
        name: 'test',
        isPreconfigured: true,
        isSystemAction: false,
        isDeprecated: false,
        referencedByCount: 2,
      },
    ]);

    expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
      perPage: 10000,
      type: 'action',
      namespaces: ['custom'],
    });

    expect(scopedClusterClient.asInternalUser.search).toHaveBeenCalledWith({
      index: kibanaIndices,
      ignore_unavailable: true,
      body: {
        aggs: {
          '1': {
            filter: {
              bool: {
                must: {
                  nested: {
                    path: 'references',
                    query: {
                      bool: {
                        filter: {
                          bool: {
                            must: [
                              {
                                term: {
                                  'references.id': '1',
                                },
                              },
                              {
                                term: {
                                  'references.type': 'action',
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          testPreconfigured: {
            filter: {
              bool: {
                must: {
                  nested: {
                    path: 'references',
                    query: {
                      bool: {
                        filter: {
                          bool: {
                            must: [
                              {
                                term: {
                                  'references.id': 'testPreconfigured',
                                },
                              },
                              {
                                term: {
                                  'references.type': 'action',
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        size: 0,
        query: {
          match_all: {},
        },
      },
    });

    expect(auditLogger.log).not.toHaveBeenCalled();
    expect(authorization.ensureAuthorized).not.toHaveBeenCalled();
  });

  test('validates connectors before return', async () => {
    internalSavedObjectsRepository.find.mockResolvedValueOnce({
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

    const result = await getAllUnsecured({
      esClient: scopedClusterClient.asInternalUser,
      inMemoryConnectors: [
        {
          id: 'testPreconfigured',
          actionTypeId: '.slack',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
          name: 'test',
          config: {
            foo: 'bar',
          },
        },
      ],
      internalSavedObjectsRepository,
      kibanaIndices,
      logger,
      spaceId: 'default',
    });

    expect(result).toEqual([
      {
        config: {
          foo: 'bar',
        },
        id: '1',
        isDeprecated: false,
        isMissingSecrets: false,
        isPreconfigured: false,
        isSystemAction: false,
        name: 'test',
        referencedByCount: 6,
      },
      {
        actionTypeId: '.slack',
        id: 'testPreconfigured',
        isDeprecated: false,
        isPreconfigured: true,
        isSystemAction: false,
        name: 'test',
        referencedByCount: 2,
      },
    ]);

    expect(logger.warn).toHaveBeenCalledWith(
      'Error validating connector: 1, Error: [actionTypeId]: expected value of type [string] but got [undefined]'
    );
  });
});
