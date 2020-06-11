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
import { AlertsAuthorization } from './alerts_authorization';
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
  // typescript is havingtrouble inferring jest's automocking
  (authorization.actions.alerting.get as jest.MockedFunction<
    typeof authorization.actions.alerting.get
  >).mockImplementation(mockAuthorizationAction);
  return authorization;
}

function mockFeature(appName: string, typeName: string, requiredApps: string[] = []) {
  return new Feature({
    id: appName,
    name: appName,
    app: requiredApps,
    privileges: {
      all: {
        alerting: {
          all: [typeName],
        },
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        alerting: {
          read: [typeName],
        },
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
  });
}
const alertsFeature = mockFeature('alerts', 'myBuiltInType');
const myAppFeature = mockFeature('myApp', 'myType', ['alerts']);
const myOtherAppFeature = mockFeature('myOtherApp', 'myType', ['alerts']);

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
  features.getFeatures.mockReturnValue([alertsFeature, myAppFeature, myOtherAppFeature]);
});

describe('ensureAuthorized', () => {
  test('is a no-op when there is no authorization api', async () => {
    const alertAuthorization = new AlertsAuthorization({
      request,
      alertTypeRegistry,
      features,
      auditLogger,
    });

    await alertAuthorization.ensureAuthorized('myType', 'myApp', 'create');

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

    await alertAuthorization.ensureAuthorized('myType', 'myApp', 'create');

    expect(alertTypeRegistry.get).toHaveBeenCalledWith('myType');

    expect(authorization.actions.alerting.get).toHaveBeenCalledWith('myType', 'myApp', 'create');
    expect(checkPrivileges).toHaveBeenCalledWith([
      mockAuthorizationAction('myType', 'myApp', 'create'),
    ]);

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

    await alertAuthorization.ensureAuthorized('myType', 'alerts', 'create');

    expect(alertTypeRegistry.get).toHaveBeenCalledWith('myType');

    expect(authorization.actions.alerting.get).toHaveBeenCalledWith('myType', 'myApp', 'create');
    expect(checkPrivileges).toHaveBeenCalledWith([
      mockAuthorizationAction('myType', 'myApp', 'create'),
    ]);

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

    await alertAuthorization.ensureAuthorized('myType', 'myOtherApp', 'create');

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
      alertAuthorization.ensureAuthorized('myType', 'myOtherApp', 'create')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unauthorized to create a \\"myType\\" alert for \\"myOtherApp\\""`
    );

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
      alertAuthorization.ensureAuthorized('myType', 'myOtherApp', 'create')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unauthorized to create a \\"myType\\" alert by \\"myApp\\""`
    );

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
      alertAuthorization.ensureAuthorized('myType', 'myOtherApp', 'create')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unauthorized to create a \\"myType\\" alert for \\"myOtherApp\\""`
    );

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
  const alertingAlertType = {
    actionGroups: [],
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    id: 'alertingAlertType',
    name: 'alertingAlertType',
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
  const setOfAlertTypes = new Set([myAppAlertType, alertingAlertType]);

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
      `"((alert.attributes.alertTypeId:myAppAlertType and (alert.attributes.consumer:alerts or alert.attributes.consumer:myApp or alert.attributes.consumer:myOtherApp)) or (alert.attributes.alertTypeId:alertingAlertType and (alert.attributes.consumer:alerts or alert.attributes.consumer:myApp or alert.attributes.consumer:myOtherApp)))"`
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
          privilege: mockAuthorizationAction('alertingAlertType', 'alerts', 'find'),
          authorized: true,
        },
        {
          privilege: mockAuthorizationAction('alertingAlertType', 'myApp', 'find'),
          authorized: true,
        },
        {
          privilege: mockAuthorizationAction('alertingAlertType', 'myOtherApp', 'find'),
          authorized: false,
        },
        {
          privilege: mockAuthorizationAction('myAppAlertType', 'alerts', 'find'),
          authorized: true,
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
    await expect(() => {
      ensureAlertTypeIsAuthorized('myAppAlertType', 'myOtherApp');
    }).toThrowErrorMatchingInlineSnapshot(
      `"Unauthorized to find a \\"myAppAlertType\\" alert for \\"myOtherApp\\""`
    );

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
          privilege: mockAuthorizationAction('alertingAlertType', 'alerts', 'find'),
          authorized: true,
        },
        {
          privilege: mockAuthorizationAction('alertingAlertType', 'myApp', 'find'),
          authorized: true,
        },
        {
          privilege: mockAuthorizationAction('alertingAlertType', 'myOtherApp', 'find'),
          authorized: false,
        },
        {
          privilege: mockAuthorizationAction('myAppAlertType', 'alerts', 'find'),
          authorized: true,
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
    await expect(() => {
      ensureAlertTypeIsAuthorized('myAppAlertType', 'myOtherApp');
    }).not.toThrow();

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

describe('checkAlertTypeAuthorization', () => {
  const alertingAlertType = {
    actionGroups: [],
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    id: 'alertingAlertType',
    name: 'alertingAlertType',
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
  const setOfAlertTypes = new Set([myAppAlertType, alertingAlertType]);

  test('augments a list of types with all features when there is no authorization api', async () => {
    const alertAuthorization = new AlertsAuthorization({
      request,
      alertTypeRegistry,
      features,
      auditLogger,
    });
    alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

    await expect(
      alertAuthorization.checkAlertTypeAuthorization(
        new Set([myAppAlertType, alertingAlertType]),
        'create'
      )
    ).resolves.toMatchInlineSnapshot(`
            Set {
              Object {
                "actionGroups": Array [],
                "actionVariables": undefined,
                "authorizedConsumers": Array [
                  "alerts",
                  "myApp",
                  "myOtherApp",
                ],
                "defaultActionGroupId": "default",
                "id": "myAppAlertType",
                "name": "myAppAlertType",
                "producer": "myApp",
              },
              Object {
                "actionGroups": Array [],
                "actionVariables": undefined,
                "authorizedConsumers": Array [
                  "alerts",
                  "myApp",
                  "myOtherApp",
                ],
                "defaultActionGroupId": "default",
                "id": "alertingAlertType",
                "name": "alertingAlertType",
                "producer": "alerts",
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
          privilege: mockAuthorizationAction('alertingAlertType', 'alerts', 'create'),
          authorized: true,
        },
        {
          privilege: mockAuthorizationAction('alertingAlertType', 'myApp', 'create'),
          authorized: true,
        },
        {
          privilege: mockAuthorizationAction('alertingAlertType', 'myOtherApp', 'create'),
          authorized: false,
        },
        {
          privilege: mockAuthorizationAction('myAppAlertType', 'alerts', 'create'),
          authorized: true,
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
      alertAuthorization.checkAlertTypeAuthorization(
        new Set([myAppAlertType, alertingAlertType]),
        'create'
      )
    ).resolves.toMatchInlineSnapshot(`
            Set {
              Object {
                "actionGroups": Array [],
                "actionVariables": undefined,
                "authorizedConsumers": Array [
                  "alerts",
                  "myApp",
                ],
                "defaultActionGroupId": "default",
                "id": "alertingAlertType",
                "name": "alertingAlertType",
                "producer": "alerts",
              },
              Object {
                "actionGroups": Array [],
                "actionVariables": undefined,
                "authorizedConsumers": Array [
                  "alerts",
                  "myApp",
                  "myOtherApp",
                ],
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
          privilege: mockAuthorizationAction('alertingAlertType', 'alerts', 'create'),
          authorized: true,
        },
        {
          privilege: mockAuthorizationAction('alertingAlertType', 'myApp', 'create'),
          authorized: true,
        },
        {
          privilege: mockAuthorizationAction('alertingAlertType', 'myOtherApp', 'create'),
          authorized: true,
        },
        {
          privilege: mockAuthorizationAction('myAppAlertType', 'alerts', 'create'),
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
      alertAuthorization.checkAlertTypeAuthorization(
        new Set([myAppAlertType, alertingAlertType]),
        'create'
      )
    ).resolves.toMatchInlineSnapshot(`
            Set {
              Object {
                "actionGroups": Array [],
                "actionVariables": undefined,
                "authorizedConsumers": Array [
                  "alerts",
                  "myApp",
                  "myOtherApp",
                ],
                "defaultActionGroupId": "default",
                "id": "alertingAlertType",
                "name": "alertingAlertType",
                "producer": "alerts",
              },
            }
          `);
  });
});
