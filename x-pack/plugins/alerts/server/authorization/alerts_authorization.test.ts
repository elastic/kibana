/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import { alertTypeRegistryMock } from '../alert_type_registry.mock';
import { securityMock } from '../../../../plugins/security/server/mocks';
import { esKuery } from '../../../../../src/plugins/data/server';
import {
  PluginStartContract as FeaturesStartContract,
  KibanaFeature,
} from '../../../features/server';
import { featuresPluginMock } from '../../../features/server/mocks';
import { AlertsAuthorization, WriteOperations, ReadOperations } from './alerts_authorization';
import { alertsAuthorizationAuditLoggerMock } from './audit_logger.mock';
import { AlertsAuthorizationAuditLogger, AuthorizationResult } from './audit_logger';
import uuid from 'uuid';

const alertTypeRegistry = alertTypeRegistryMock.create();
const features: jest.Mocked<FeaturesStartContract> = featuresPluginMock.createStart();
const request = {} as KibanaRequest;

const auditLogger = alertsAuthorizationAuditLoggerMock.create();
const realAuditLogger = new AlertsAuthorizationAuditLogger();

const getSpace = jest.fn();

const mockAuthorizationAction = (type: string, app: string, operation: string) =>
  `${type}/${app}/${operation}`;
function mockSecurity() {
  const security = securityMock.createSetup();
  const authorization = security.authz;
  // typescript is having trouble inferring jest's automocking
  (authorization.actions.alerting.get as jest.MockedFunction<
    typeof authorization.actions.alerting.get
  >).mockImplementation(mockAuthorizationAction);
  authorization.mode.useRbacForRequest.mockReturnValue(true);
  return { authorization };
}

function mockFeature(appName: string, typeName?: string) {
  return new KibanaFeature({
    id: appName,
    name: appName,
    app: [],
    category: { id: 'foo', label: 'foo' },
    ...(typeName
      ? {
          alerting: [typeName],
        }
      : {}),
    privileges: {
      all: {
        ...(typeName
          ? {
              alerting: {
                all: [typeName],
              },
            }
          : {}),
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        ...(typeName
          ? {
              alerting: {
                read: [typeName],
              },
            }
          : {}),
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
  });
}

function mockFeatureWithSubFeature(appName: string, typeName: string) {
  return new KibanaFeature({
    id: appName,
    name: appName,
    app: [],
    category: { id: 'foo', label: 'foo' },
    ...(typeName
      ? {
          alerting: [typeName],
        }
      : {}),
    privileges: {
      all: {
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
    subFeatures: [
      {
        name: appName,
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'doSomethingAlertRelated',
                name: 'sub feature alert',
                includeIn: 'all',
                alerting: {
                  all: [typeName],
                },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['doSomethingAlertRelated'],
              },
              {
                id: 'doSomethingAlertRelated',
                name: 'sub feature alert',
                includeIn: 'read',
                alerting: {
                  read: [typeName],
                },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['doSomethingAlertRelated'],
              },
            ],
          },
        ],
      },
    ],
  });
}

const myAppFeature = mockFeature('myApp', 'myType');
const myOtherAppFeature = mockFeature('myOtherApp', 'myType');
const myAppWithSubFeature = mockFeatureWithSubFeature('myAppWithSubFeature', 'myType');
const myFeatureWithoutAlerting = mockFeature('myOtherApp');

beforeEach(() => {
  jest.resetAllMocks();
  auditLogger.alertsAuthorizationFailure.mockImplementation((username, ...args) =>
    realAuditLogger.getAuthorizationMessage(AuthorizationResult.Unauthorized, ...args)
  );
  auditLogger.alertsAuthorizationSuccess.mockImplementation((username, ...args) =>
    realAuditLogger.getAuthorizationMessage(AuthorizationResult.Authorized, ...args)
  );
  auditLogger.alertsUnscopedAuthorizationFailure.mockImplementation(
    (username, operation) => `Unauthorized ${username}/${operation}`
  );
  alertTypeRegistry.get.mockImplementation((id) => ({
    id,
    name: 'My Alert Type',
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    async executor() {},
    producer: 'myApp',
  }));
  features.getKibanaFeatures.mockReturnValue([
    myAppFeature,
    myOtherAppFeature,
    myAppWithSubFeature,
    myFeatureWithoutAlerting,
  ]);
  getSpace.mockResolvedValue(undefined);
});

describe('AlertsAuthorization', () => {
  describe('constructor', () => {
    test(`fetches the user's current space`, async () => {
      const space = {
        id: uuid.v4(),
        name: uuid.v4(),
        disabledFeatures: [],
      };
      getSpace.mockResolvedValue(space);

      new AlertsAuthorization({
        request,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });

      expect(getSpace).toHaveBeenCalledWith(request);
    });
  });

  describe('ensureAuthorized', () => {
    test('is a no-op when there is no authorization api', async () => {
      const alertAuthorization = new AlertsAuthorization({
        request,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });

      await alertAuthorization.ensureAuthorized('myType', 'myApp', WriteOperations.Create);

      expect(alertTypeRegistry.get).toHaveBeenCalledTimes(0);
    });

    test('is a no-op when the security license is disabled', async () => {
      const { authorization } = mockSecurity();
      authorization.mode.useRbacForRequest.mockReturnValue(false);
      const alertAuthorization = new AlertsAuthorization({
        request,
        alertTypeRegistry,
        authorization,
        features,
        auditLogger,
        getSpace,
      });

      await alertAuthorization.ensureAuthorized('myType', 'myApp', WriteOperations.Create);

      expect(alertTypeRegistry.get).toHaveBeenCalledTimes(0);
    });

    test('ensures the user has privileges to execute the specified type, operation and consumer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });

      await alertAuthorization.ensureAuthorized('myType', 'myApp', WriteOperations.Create);

      expect(alertTypeRegistry.get).toHaveBeenCalledWith('myType');

      expect(authorization.actions.alerting.get).toHaveBeenCalledWith('myType', 'myApp', 'create');
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [mockAuthorizationAction('myType', 'myApp', 'create')],
      });

      expect(auditLogger.alertsAuthorizationSuccess).toHaveBeenCalledTimes(1);
      expect(auditLogger.alertsAuthorizationFailure).not.toHaveBeenCalled();
      expect(auditLogger.alertsAuthorizationSuccess.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "some-user",
          "myType",
          0,
          "myApp",
          "create",
        ]
      `);
    });

    test('ensures the user has privileges to execute the specified type and operation without consumer when consumer is alerts', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });

      await alertAuthorization.ensureAuthorized('myType', 'alerts', WriteOperations.Create);

      expect(alertTypeRegistry.get).toHaveBeenCalledWith('myType');

      expect(authorization.actions.alerting.get).toHaveBeenCalledWith('myType', 'myApp', 'create');
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [mockAuthorizationAction('myType', 'myApp', 'create')],
      });

      expect(auditLogger.alertsAuthorizationSuccess).toHaveBeenCalledTimes(1);
      expect(auditLogger.alertsAuthorizationFailure).not.toHaveBeenCalled();
      expect(auditLogger.alertsAuthorizationSuccess.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "some-user",
          "myType",
          0,
          "alerts",
          "create",
        ]
      `);
    });

    test('ensures the user has privileges to execute the specified type, operation and producer when producer is different from consumer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });

      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });

      await alertAuthorization.ensureAuthorized('myType', 'myOtherApp', WriteOperations.Create);

      expect(alertTypeRegistry.get).toHaveBeenCalledWith('myType');

      expect(authorization.actions.alerting.get).toHaveBeenCalledWith('myType', 'myApp', 'create');
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'myOtherApp',
        'create'
      );
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [
          mockAuthorizationAction('myType', 'myOtherApp', 'create'),
          mockAuthorizationAction('myType', 'myApp', 'create'),
        ],
      });

      expect(auditLogger.alertsAuthorizationSuccess).toHaveBeenCalledTimes(1);
      expect(auditLogger.alertsAuthorizationFailure).not.toHaveBeenCalled();
      expect(auditLogger.alertsAuthorizationSuccess.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "some-user",
          "myType",
          0,
          "myOtherApp",
          "create",
        ]
      `);
    });

    test('throws if user lacks the required privieleges for the consumer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myType', 'myOtherApp', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myType', 'myApp', 'create'),
              authorized: true,
            },
          ],
        },
      });

      await expect(
        alertAuthorization.ensureAuthorized('myType', 'myOtherApp', WriteOperations.Create)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to create a \\"myType\\" alert for \\"myOtherApp\\""`
      );

      expect(auditLogger.alertsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(auditLogger.alertsAuthorizationFailure).toHaveBeenCalledTimes(1);
      expect(auditLogger.alertsAuthorizationFailure.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "some-user",
          "myType",
          0,
          "myOtherApp",
          "create",
        ]
      `);
    });

    test('throws if user lacks the required privieleges for the producer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myType', 'myOtherApp', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myType', 'myApp', 'create'),
              authorized: false,
            },
          ],
        },
      });

      await expect(
        alertAuthorization.ensureAuthorized('myType', 'myOtherApp', WriteOperations.Create)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to create a \\"myType\\" alert by \\"myApp\\""`
      );

      expect(auditLogger.alertsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(auditLogger.alertsAuthorizationFailure).toHaveBeenCalledTimes(1);
      expect(auditLogger.alertsAuthorizationFailure.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "some-user",
          "myType",
          1,
          "myApp",
          "create",
        ]
      `);
    });

    test('throws if user lacks the required privieleges for both consumer and producer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myType', 'myOtherApp', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myType', 'myApp', 'create'),
              authorized: false,
            },
          ],
        },
      });

      await expect(
        alertAuthorization.ensureAuthorized('myType', 'myOtherApp', WriteOperations.Create)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to create a \\"myType\\" alert for \\"myOtherApp\\""`
      );

      expect(auditLogger.alertsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(auditLogger.alertsAuthorizationFailure).toHaveBeenCalledTimes(1);
      expect(auditLogger.alertsAuthorizationFailure.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "some-user",
          "myType",
          0,
          "myOtherApp",
          "create",
        ]
      `);
    });
  });

  describe('getFindAuthorizationFilter', () => {
    const myOtherAppAlertType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      id: 'myOtherAppAlertType',
      name: 'myOtherAppAlertType',
      producer: 'alerts',
    };
    const myAppAlertType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      id: 'myAppAlertType',
      name: 'myAppAlertType',
      producer: 'myApp',
    };
    const mySecondAppAlertType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      id: 'mySecondAppAlertType',
      name: 'mySecondAppAlertType',
      producer: 'myApp',
    };
    const setOfAlertTypes = new Set([myAppAlertType, myOtherAppAlertType, mySecondAppAlertType]);

    test('omits filter when there is no authorization api', async () => {
      const alertAuthorization = new AlertsAuthorization({
        request,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });

      const {
        filter,
        ensureAlertTypeIsAuthorized,
      } = await alertAuthorization.getFindAuthorizationFilter();

      expect(() => ensureAlertTypeIsAuthorized('someMadeUpType', 'myApp')).not.toThrow();

      expect(filter).toEqual(undefined);
    });

    test('ensureAlertTypeIsAuthorized is no-op when there is no authorization api', async () => {
      const alertAuthorization = new AlertsAuthorization({
        request,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });

      const { ensureAlertTypeIsAuthorized } = await alertAuthorization.getFindAuthorizationFilter();

      ensureAlertTypeIsAuthorized('someMadeUpType', 'myApp');

      expect(auditLogger.alertsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(auditLogger.alertsAuthorizationFailure).not.toHaveBeenCalled();
    });

    test('creates a filter based on the privileged types', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });

      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });
      alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      expect((await alertAuthorization.getFindAuthorizationFilter()).filter).toEqual(
        esKuery.fromKueryExpression(
          `((alert.attributes.alertTypeId:myAppAlertType and alert.attributes.consumer:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (alert.attributes.alertTypeId:myOtherAppAlertType and alert.attributes.consumer:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (alert.attributes.alertTypeId:mySecondAppAlertType and alert.attributes.consumer:(alerts or myApp or myOtherApp or myAppWithSubFeature)))`
        )
      );

      expect(auditLogger.alertsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test('creates an `ensureAlertTypeIsAuthorized` function which throws if type is unauthorized', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'find'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'find'),
              authorized: false,
            },
          ],
        },
      });

      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });
      alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      const { ensureAlertTypeIsAuthorized } = await alertAuthorization.getFindAuthorizationFilter();
      expect(() => {
        ensureAlertTypeIsAuthorized('myAppAlertType', 'myOtherApp');
      }).toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to find a \\"myAppAlertType\\" alert for \\"myOtherApp\\""`
      );

      expect(auditLogger.alertsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(auditLogger.alertsAuthorizationFailure).toHaveBeenCalledTimes(1);
      expect(auditLogger.alertsAuthorizationFailure.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "some-user",
          "myAppAlertType",
          0,
          "myOtherApp",
          "find",
        ]
      `);
    });

    test('creates an `ensureAlertTypeIsAuthorized` function which is no-op if type is authorized', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'find'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'find'),
              authorized: true,
            },
          ],
        },
      });

      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });
      alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      const { ensureAlertTypeIsAuthorized } = await alertAuthorization.getFindAuthorizationFilter();
      expect(() => {
        ensureAlertTypeIsAuthorized('myAppAlertType', 'myOtherApp');
      }).not.toThrow();

      expect(auditLogger.alertsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(auditLogger.alertsAuthorizationFailure).not.toHaveBeenCalled();
    });

    test('creates an `logSuccessfulAuthorization` function which logs every authorized type', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'find'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('mySecondAppAlertType', 'myApp', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('mySecondAppAlertType', 'myOtherApp', 'find'),
              authorized: true,
            },
          ],
        },
      });

      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });
      alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      const {
        ensureAlertTypeIsAuthorized,
        logSuccessfulAuthorization,
      } = await alertAuthorization.getFindAuthorizationFilter();
      expect(() => {
        ensureAlertTypeIsAuthorized('myAppAlertType', 'myOtherApp');
        ensureAlertTypeIsAuthorized('mySecondAppAlertType', 'myOtherApp');
        ensureAlertTypeIsAuthorized('myAppAlertType', 'myOtherApp');
      }).not.toThrow();

      expect(auditLogger.alertsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(auditLogger.alertsAuthorizationFailure).not.toHaveBeenCalled();

      logSuccessfulAuthorization();

      expect(auditLogger.alertsBulkAuthorizationSuccess).toHaveBeenCalledTimes(1);
      expect(auditLogger.alertsBulkAuthorizationSuccess.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "some-user",
          Array [
            Array [
              "myAppAlertType",
              "myOtherApp",
            ],
            Array [
              "mySecondAppAlertType",
              "myOtherApp",
            ],
          ],
          0,
          "find",
        ]
      `);
    });
  });

  describe('filterByAlertTypeAuthorization', () => {
    const myOtherAppAlertType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      id: 'myOtherAppAlertType',
      name: 'myOtherAppAlertType',
      producer: 'myOtherApp',
    };
    const myAppAlertType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      id: 'myAppAlertType',
      name: 'myAppAlertType',
      producer: 'myApp',
    };
    const setOfAlertTypes = new Set([myAppAlertType, myOtherAppAlertType]);

    test('augments a list of types with all features when there is no authorization api', async () => {
      const alertAuthorization = new AlertsAuthorization({
        request,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });
      alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      await expect(
        alertAuthorization.filterByAlertTypeAuthorization(
          new Set([myAppAlertType, myOtherAppAlertType]),
          [WriteOperations.Create]
        )
      ).resolves.toMatchInlineSnapshot(`
              Set {
                Object {
                  "actionGroups": Array [],
                  "actionVariables": undefined,
                  "authorizedConsumers": Object {
                    "alerts": Object {
                      "all": true,
                      "read": true,
                    },
                    "myApp": Object {
                      "all": true,
                      "read": true,
                    },
                    "myAppWithSubFeature": Object {
                      "all": true,
                      "read": true,
                    },
                    "myOtherApp": Object {
                      "all": true,
                      "read": true,
                    },
                  },
                  "defaultActionGroupId": "default",
                  "id": "myAppAlertType",
                  "name": "myAppAlertType",
                  "producer": "myApp",
                },
                Object {
                  "actionGroups": Array [],
                  "actionVariables": undefined,
                  "authorizedConsumers": Object {
                    "alerts": Object {
                      "all": true,
                      "read": true,
                    },
                    "myApp": Object {
                      "all": true,
                      "read": true,
                    },
                    "myAppWithSubFeature": Object {
                      "all": true,
                      "read": true,
                    },
                    "myOtherApp": Object {
                      "all": true,
                      "read": true,
                    },
                  },
                  "defaultActionGroupId": "default",
                  "id": "myOtherAppAlertType",
                  "name": "myOtherAppAlertType",
                  "producer": "myOtherApp",
                },
              }
            `);
    });

    test('augments a list of types with consumers under which the operation is authorized', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'create'),
              authorized: true,
            },
          ],
        },
      });

      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });
      alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      await expect(
        alertAuthorization.filterByAlertTypeAuthorization(
          new Set([myAppAlertType, myOtherAppAlertType]),
          [WriteOperations.Create]
        )
      ).resolves.toMatchInlineSnapshot(`
              Set {
                Object {
                  "actionGroups": Array [],
                  "actionVariables": undefined,
                  "authorizedConsumers": Object {
                    "myApp": Object {
                      "all": true,
                      "read": true,
                    },
                  },
                  "defaultActionGroupId": "default",
                  "id": "myOtherAppAlertType",
                  "name": "myOtherAppAlertType",
                  "producer": "myOtherApp",
                },
                Object {
                  "actionGroups": Array [],
                  "actionVariables": undefined,
                  "authorizedConsumers": Object {
                    "alerts": Object {
                      "all": true,
                      "read": true,
                    },
                    "myApp": Object {
                      "all": true,
                      "read": true,
                    },
                    "myOtherApp": Object {
                      "all": true,
                      "read": true,
                    },
                  },
                  "defaultActionGroupId": "default",
                  "id": "myAppAlertType",
                  "name": "myAppAlertType",
                  "producer": "myApp",
                },
              }
            `);
    });

    test('authorizes user under the Alerts consumer when they are authorized by the producer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'create'),
              authorized: false,
            },
          ],
        },
      });

      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });
      alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      await expect(
        alertAuthorization.filterByAlertTypeAuthorization(new Set([myAppAlertType]), [
          WriteOperations.Create,
        ])
      ).resolves.toMatchInlineSnapshot(`
              Set {
                Object {
                  "actionGroups": Array [],
                  "actionVariables": undefined,
                  "authorizedConsumers": Object {
                    "alerts": Object {
                      "all": true,
                      "read": true,
                    },
                    "myApp": Object {
                      "all": true,
                      "read": true,
                    },
                  },
                  "defaultActionGroupId": "default",
                  "id": "myAppAlertType",
                  "name": "myAppAlertType",
                  "producer": "myApp",
                },
              }
            `);
    });

    test('augments a list of types with consumers under which multiple operations are authorized', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'get'),
              authorized: true,
            },
          ],
        },
      });

      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });
      alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      await expect(
        alertAuthorization.filterByAlertTypeAuthorization(
          new Set([myAppAlertType, myOtherAppAlertType]),
          [WriteOperations.Create, ReadOperations.Get]
        )
      ).resolves.toMatchInlineSnapshot(`
              Set {
                Object {
                  "actionGroups": Array [],
                  "actionVariables": undefined,
                  "authorizedConsumers": Object {
                    "alerts": Object {
                      "all": false,
                      "read": true,
                    },
                    "myApp": Object {
                      "all": true,
                      "read": true,
                    },
                    "myOtherApp": Object {
                      "all": false,
                      "read": true,
                    },
                  },
                  "defaultActionGroupId": "default",
                  "id": "myOtherAppAlertType",
                  "name": "myOtherAppAlertType",
                  "producer": "myOtherApp",
                },
                Object {
                  "actionGroups": Array [],
                  "actionVariables": undefined,
                  "authorizedConsumers": Object {
                    "alerts": Object {
                      "all": false,
                      "read": true,
                    },
                    "myApp": Object {
                      "all": false,
                      "read": true,
                    },
                    "myOtherApp": Object {
                      "all": false,
                      "read": true,
                    },
                  },
                  "defaultActionGroupId": "default",
                  "id": "myAppAlertType",
                  "name": "myAppAlertType",
                  "producer": "myApp",
                },
              }
            `);
    });

    test('omits types which have no consumers under which the operation is authorized', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<ReturnType<
        typeof authorization.checkPrivilegesDynamicallyWithRequest
      >> = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'create'),
              authorized: false,
            },
          ],
        },
      });

      const alertAuthorization = new AlertsAuthorization({
        request,
        authorization,
        alertTypeRegistry,
        features,
        auditLogger,
        getSpace,
      });
      alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      await expect(
        alertAuthorization.filterByAlertTypeAuthorization(
          new Set([myAppAlertType, myOtherAppAlertType]),
          [WriteOperations.Create]
        )
      ).resolves.toMatchInlineSnapshot(`
              Set {
                Object {
                  "actionGroups": Array [],
                  "actionVariables": undefined,
                  "authorizedConsumers": Object {
                    "alerts": Object {
                      "all": true,
                      "read": true,
                    },
                    "myApp": Object {
                      "all": true,
                      "read": true,
                    },
                    "myOtherApp": Object {
                      "all": true,
                      "read": true,
                    },
                  },
                  "defaultActionGroupId": "default",
                  "id": "myOtherAppAlertType",
                  "name": "myOtherAppAlertType",
                  "producer": "myOtherApp",
                },
              }
            `);
    });
  });
});
