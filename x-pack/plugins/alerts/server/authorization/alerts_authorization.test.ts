/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest } from 'kibana/server';
import { alertTypeRegistryMock } from '../alert_type_registry.mock';
import { securityMock } from '../../../../plugins/security/server/mocks';
import { PluginStartContract as FeaturesStartContract, Feature } from '../../../features/server';
import { featuresPluginMock } from '../../../features/server/mocks';
import {
  AlertsAuthorization,
  ensureFieldIsSafeForQuery,
  WriteOperations,
  ReadOperations,
} from './alerts_authorization';
import { alertsAuthorizationAuditLoggerMock } from './audit_logger.mock';
import { AlertsAuthorizationAuditLogger, AuthorizationResult } from './audit_logger';

const alertTypeRegistry = alertTypeRegistryMock.create();
const features: jest.Mocked<FeaturesStartContract> = featuresPluginMock.createStart();
const request = {} as KibanaRequest;

const auditLogger = alertsAuthorizationAuditLoggerMock.create();
const realAuditLogger = new AlertsAuthorizationAuditLogger();

const mockAuthorizationAction = (type: string, app: string, operation: string) =>
  `${type}/${app}/${operation}`;
function mockAuthorization() {
  const authorization = securityMock.createSetup().authz;
  // typescript is having trouble inferring jest's automocking
  (authorization.actions.alerting.get as jest.MockedFunction<
    typeof authorization.actions.alerting.get
  >).mockImplementation(mockAuthorizationAction);
  return authorization;
}

function mockFeature(appName: string, typeName?: string) {
  return new Feature({
    id: appName,
    name: appName,
    app: [],
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
  return new Feature({
    id: appName,
    name: appName,
    app: [],
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
  features.getFeatures.mockReturnValue([
    myAppFeature,
    myOtherAppFeature,
    myAppWithSubFeature,
    myFeatureWithoutAlerting,
  ]);
});

describe('ensureAuthorized', () => {
  test('is a no-op when there is no authorization api', async () => {
    const alertAuthorization = new AlertsAuthorization({
      request,
      alertTypeRegistry,
      features,
      auditLogger,
    });

    await alertAuthorization.ensureAuthorized('myType', 'myApp', WriteOperations.Create);

    expect(alertTypeRegistry.get).toHaveBeenCalledTimes(0);
  });

  test('ensures the user has privileges to execute the specified type, operation and consumer', async () => {
    const authorization = mockAuthorization();
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
    });

    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: true,
      privileges: [],
    });

    await alertAuthorization.ensureAuthorized('myType', 'myApp', WriteOperations.Create);

    expect(alertTypeRegistry.get).toHaveBeenCalledWith('myType');

    expect(authorization.actions.alerting.get).toHaveBeenCalledWith('myType', 'myApp', 'create');
    expect(checkPrivileges).toHaveBeenCalledWith([
      mockAuthorizationAction('myType', 'myApp', 'create'),
    ]);

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
    const authorization = mockAuthorization();
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
    });

    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: true,
      privileges: [],
    });

    await alertAuthorization.ensureAuthorized('myType', 'alerts', WriteOperations.Create);

    expect(alertTypeRegistry.get).toHaveBeenCalledWith('myType');

    expect(authorization.actions.alerting.get).toHaveBeenCalledWith('myType', 'myApp', 'create');
    expect(checkPrivileges).toHaveBeenCalledWith([
      mockAuthorizationAction('myType', 'myApp', 'create'),
    ]);

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
    const authorization = mockAuthorization();
    const checkPrivileges: jest.MockedFunction<ReturnType<
      typeof authorization.checkPrivilegesDynamicallyWithRequest
    >> = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: true,
      privileges: [],
    });

    const alertAuthorization = new AlertsAuthorization({
      request,
      authorization,
      alertTypeRegistry,
      features,
      auditLogger,
    });

    await alertAuthorization.ensureAuthorized('myType', 'myOtherApp', WriteOperations.Create);

    expect(alertTypeRegistry.get).toHaveBeenCalledWith('myType');

    expect(authorization.actions.alerting.get).toHaveBeenCalledWith('myType', 'myApp', 'create');
    expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
      'myType',
      'myOtherApp',
      'create'
    );
    expect(checkPrivileges).toHaveBeenCalledWith([
      mockAuthorizationAction('myType', 'myOtherApp', 'create'),
      mockAuthorizationAction('myType', 'myApp', 'create'),
    ]);

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
    const authorization = mockAuthorization();
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
    });

    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: false,
      privileges: [
        {
          privilege: mockAuthorizationAction('myType', 'myOtherApp', 'create'),
          authorized: false,
        },
        {
          privilege: mockAuthorizationAction('myType', 'myApp', 'create'),
          authorized: true,
        },
      ],
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
    const authorization = mockAuthorization();
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
    });

    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: false,
      privileges: [
        {
          privilege: mockAuthorizationAction('myType', 'myOtherApp', 'create'),
          authorized: true,
        },
        {
          privilege: mockAuthorizationAction('myType', 'myApp', 'create'),
          authorized: false,
        },
      ],
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
    const authorization = mockAuthorization();
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
    });

    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: false,
      privileges: [
        {
          privilege: mockAuthorizationAction('myType', 'myOtherApp', 'create'),
          authorized: false,
        },
        {
          privilege: mockAuthorizationAction('myType', 'myApp', 'create'),
          authorized: false,
        },
      ],
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
  const setOfAlertTypes = new Set([myAppAlertType, myOtherAppAlertType]);

  test('omits filter when there is no authorization api', async () => {
    const alertAuthorization = new AlertsAuthorization({
      request,
      alertTypeRegistry,
      features,
      auditLogger,
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
    });

    const { ensureAlertTypeIsAuthorized } = await alertAuthorization.getFindAuthorizationFilter();

    ensureAlertTypeIsAuthorized('someMadeUpType', 'myApp');

    expect(auditLogger.alertsAuthorizationSuccess).not.toHaveBeenCalled();
    expect(auditLogger.alertsAuthorizationFailure).not.toHaveBeenCalled();
  });

  test('creates a filter based on the privileged types', async () => {
    const authorization = mockAuthorization();
    const checkPrivileges: jest.MockedFunction<ReturnType<
      typeof authorization.checkPrivilegesDynamicallyWithRequest
    >> = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: true,
      privileges: [],
    });

    const alertAuthorization = new AlertsAuthorization({
      request,
      authorization,
      alertTypeRegistry,
      features,
      auditLogger,
    });
    alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

    expect((await alertAuthorization.getFindAuthorizationFilter()).filter).toMatchInlineSnapshot(
      `"((alert.attributes.alertTypeId:myAppAlertType and alert.attributes.consumer:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (alert.attributes.alertTypeId:myOtherAppAlertType and alert.attributes.consumer:(alerts or myApp or myOtherApp or myAppWithSubFeature)))"`
    );

    expect(auditLogger.alertsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test('creates an `ensureAlertTypeIsAuthorized` function which throws if type is unauthorized', async () => {
    const authorization = mockAuthorization();
    const checkPrivileges: jest.MockedFunction<ReturnType<
      typeof authorization.checkPrivilegesDynamicallyWithRequest
    >> = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: false,
      privileges: [
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
    });

    const alertAuthorization = new AlertsAuthorization({
      request,
      authorization,
      alertTypeRegistry,
      features,
      auditLogger,
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
    const authorization = mockAuthorization();
    const checkPrivileges: jest.MockedFunction<ReturnType<
      typeof authorization.checkPrivilegesDynamicallyWithRequest
    >> = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: false,
      privileges: [
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
    });

    const alertAuthorization = new AlertsAuthorization({
      request,
      authorization,
      alertTypeRegistry,
      features,
      auditLogger,
    });
    alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

    const { ensureAlertTypeIsAuthorized } = await alertAuthorization.getFindAuthorizationFilter();
    expect(() => {
      ensureAlertTypeIsAuthorized('myAppAlertType', 'myOtherApp');
    }).not.toThrow();

    expect(auditLogger.alertsAuthorizationSuccess).toHaveBeenCalledTimes(1);
    expect(auditLogger.alertsAuthorizationFailure).not.toHaveBeenCalled();
    expect(auditLogger.alertsAuthorizationSuccess.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "some-user",
        "myAppAlertType",
        0,
        "myOtherApp",
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
    const authorization = mockAuthorization();
    const checkPrivileges: jest.MockedFunction<ReturnType<
      typeof authorization.checkPrivilegesDynamicallyWithRequest
    >> = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: false,
      privileges: [
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
    });

    const alertAuthorization = new AlertsAuthorization({
      request,
      authorization,
      alertTypeRegistry,
      features,
      auditLogger,
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
    const authorization = mockAuthorization();
    const checkPrivileges: jest.MockedFunction<ReturnType<
      typeof authorization.checkPrivilegesDynamicallyWithRequest
    >> = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: false,
      privileges: [
        {
          privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'create'),
          authorized: true,
        },
        {
          privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'create'),
          authorized: false,
        },
      ],
    });

    const alertAuthorization = new AlertsAuthorization({
      request,
      authorization,
      alertTypeRegistry,
      features,
      auditLogger,
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
    const authorization = mockAuthorization();
    const checkPrivileges: jest.MockedFunction<ReturnType<
      typeof authorization.checkPrivilegesDynamicallyWithRequest
    >> = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: false,
      privileges: [
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
    });

    const alertAuthorization = new AlertsAuthorization({
      request,
      authorization,
      alertTypeRegistry,
      features,
      auditLogger,
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
    const authorization = mockAuthorization();
    const checkPrivileges: jest.MockedFunction<ReturnType<
      typeof authorization.checkPrivilegesDynamicallyWithRequest
    >> = jest.fn();
    authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    checkPrivileges.mockResolvedValueOnce({
      username: 'some-user',
      hasAllRequested: false,
      privileges: [
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
    });

    const alertAuthorization = new AlertsAuthorization({
      request,
      authorization,
      alertTypeRegistry,
      features,
      auditLogger,
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

describe('ensureFieldIsSafeForQuery', () => {
  test('throws if field contains character that isnt safe in a KQL query', () => {
    expect(() => ensureFieldIsSafeForQuery('id', 'alert-*')).toThrowError(
      `expected id not to include invalid character: *`
    );

    expect(() => ensureFieldIsSafeForQuery('id', '<=""')).toThrowError(
      `expected id not to include invalid character: <=`
    );

    expect(() => ensureFieldIsSafeForQuery('id', '>=""')).toThrowError(
      `expected id not to include invalid character: >=`
    );

    expect(() => ensureFieldIsSafeForQuery('id', '1 or alertid:123')).toThrowError(
      `expected id not to include whitespace and invalid character: :`
    );

    expect(() => ensureFieldIsSafeForQuery('id', ') or alertid:123')).toThrowError(
      `expected id not to include whitespace and invalid characters: ), :`
    );

    expect(() => ensureFieldIsSafeForQuery('id', 'some space')).toThrowError(
      `expected id not to include whitespace`
    );
  });

  test('doesnt throws if field is safe as part of a KQL query', () => {
    expect(() => ensureFieldIsSafeForQuery('id', '123-0456-678')).not.toThrow();
  });
});
