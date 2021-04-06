/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';

import { securityMock } from '../../../../plugins/security/server/mocks';
import {
  PluginStartContract as FeaturesStartContract,
  KibanaFeature,
} from '../../../features/server';
import { featuresPluginMock } from '../../../features/server/mocks';
import { RacAuthorization, WriteOperations, ReadOperations } from './rac_authorization';
import { alertsAuthorizationAuditLoggerMock } from './audit_logger.mock';
import uuid from 'uuid';

jest.mock('./audit_logger');

const features: jest.Mocked<FeaturesStartContract> = featuresPluginMock.createStart();
const request = {} as KibanaRequest;

const auditLogger = alertsAuthorizationAuditLoggerMock.create();

const getSpace = jest.fn();

const mockAuthorizationAction = (owner: string, operation: string) => `${owner}/${operation}`;
function mockSecurity() {
  const security = securityMock.createSetup();
  const authorization = security.authz;
  (authorization.actions.rac.get as jest.MockedFunction<
    typeof authorization.actions.rac.get
  >).mockImplementation(mockAuthorizationAction);
  authorization.mode.useRbacForRequest.mockReturnValue(true);
  return { authorization };
}

function mockFeature(appName: string, owner?: string) {
  return new KibanaFeature({
    id: appName,
    name: appName,
    app: [],
    category: { id: 'foo', label: 'foo' },
    ...(owner
      ? {
          rac: [owner],
        }
      : {}),
    privileges: {
      all: {
        ...(owner
          ? {
              rac: {
                all: [owner],
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
        ...(owner
          ? {
              rac: {
                read: [owner],
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

function mockFeatureWithSubFeature(appName: string, owner: string) {
  return new KibanaFeature({
    id: appName,
    name: appName,
    app: [],
    category: { id: 'foo', label: 'foo' },
    ...(owner
      ? {
          alerting: [owner],
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
                id: 'doSomethingRacRelated',
                name: 'sub feature rac',
                includeIn: 'all',
                alerting: {
                  all: [owner],
                },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['doSomethingRacRelated'],
              },
              {
                id: 'doSomethingRacRelated',
                name: 'sub feature rac',
                includeIn: 'read',
                alerting: {
                  read: [owner],
                },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['doSomethingRacRelated'],
              },
            ],
          },
        ],
      },
    ],
  });
}

const myAppFeature = mockFeature('myApp', 'securitySolution');
const myOtherAppFeature = mockFeature('myOtherApp', 'securitySolution');
const myAppWithSubFeature = mockFeatureWithSubFeature('myAppWithSubFeature', 'securitySolution');
const myFeatureWithoutAlerting = mockFeature('myOtherApp');

beforeEach(() => {
  jest.resetAllMocks();

  features.getKibanaFeatures.mockReturnValue([
    myAppFeature,
    myOtherAppFeature,
    myAppWithSubFeature,
    myFeatureWithoutAlerting,
  ]);
  getSpace.mockResolvedValue(undefined);
});

describe('RacAuthorization', () => {
  describe('create', () => {
    test(`fetches the user's current space`, async () => {
      const { authorization } = mockSecurity();

      const space = {
        id: uuid.v4(),
        name: uuid.v4(),
        disabledFeatures: [],
      };
      getSpace.mockResolvedValue(space);

      RacAuthorization.create({
        request,
        authorization,
        features,
        auditLogger,
        getSpace,
        isAuthEnabled: true,
      });

      expect(getSpace).toHaveBeenCalledWith(request);
    });
  });

  describe('ensureAuthorized', () => {
    test('is a no-op when there is no authorization api', async () => {
      const racAuthorization = await RacAuthorization.create({
        request,
        features,
        auditLogger,
        getSpace,
        isAuthEnabled: true,
      });

      await expect(
        racAuthorization.ensureAuthorized('securitySolution', WriteOperations.Update)
      ).resolves.toBeUndefined();
    });

    test('is a no-op when the security license is disabled', async () => {
      const { authorization } = mockSecurity();
      authorization.mode.useRbacForRequest.mockReturnValue(false);
      const racAuthorization = await RacAuthorization.create({
        request,
        features,
        authorization,
        auditLogger,
        getSpace,
        isAuthEnabled: true,
      });

      await expect(
        racAuthorization.ensureAuthorized('securitySolution', WriteOperations.Update)
      ).resolves.toBeUndefined();
    });

    test('ensures the user has privileges to execute update operation with specified spaceId and owner', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const racAuthorization = await RacAuthorization.create({
        request,
        features,
        authorization,
        auditLogger,
        getSpace,
        isAuthEnabled: true,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });

      await racAuthorization.ensureAuthorized('securitySolution', WriteOperations.Update);

      expect(authorization.actions.rac.get).toHaveBeenCalledWith('securitySolution', 'update');
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [mockAuthorizationAction('securitySolution', 'update')],
      });

      expect(auditLogger.racAuthorizationSuccess).toHaveBeenCalledTimes(1);
      expect(auditLogger.racAuthorizationFailure).not.toHaveBeenCalled();
      expect(auditLogger.racAuthorizationSuccess.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "operation": "update",
            "owner": "securitySolution",
            "type": "access",
            "username": "some-user",
          },
        ]
      `);
    });

    test('ensures the user has privileges to execute find operation with specified spaceId and owner', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const racAuthorization = await RacAuthorization.create({
        request,
        features,
        authorization,
        auditLogger,
        getSpace,
        isAuthEnabled: true,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });

      await racAuthorization.ensureAuthorized('securitySolution', ReadOperations.Find);

      expect(authorization.actions.rac.get).toHaveBeenCalledWith('securitySolution', 'find');
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [mockAuthorizationAction('securitySolution', 'find')],
      });

      expect(auditLogger.racAuthorizationSuccess).toHaveBeenCalledTimes(1);
      expect(auditLogger.racAuthorizationFailure).not.toHaveBeenCalled();
      expect(auditLogger.racAuthorizationSuccess.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "operation": "find",
            "owner": "securitySolution",
            "type": "access",
            "username": "some-user",
          },
        ]
      `);
    });

    test('throws if user lacks the required privileges', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const racAuthorization = await RacAuthorization.create({
        request,
        authorization,
        features,
        auditLogger,
        getSpace,
        isAuthEnabled: true,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('securitySolution', 'update'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('observability', 'update'),
              authorized: true,
            },
          ],
        },
      });

      await expect(
        racAuthorization.ensureAuthorized('myOtherApp', WriteOperations.Update)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Forbidden"`);

      expect(auditLogger.racAuthorizationSuccess).not.toHaveBeenCalled();
      expect(auditLogger.racAuthorizationFailure).toHaveBeenCalledTimes(1);
      expect(auditLogger.racAuthorizationFailure.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "operation": "update",
            "owner": "myOtherApp",
            "type": "access",
            "username": "some-user",
          },
        ]
      `);
    });
  });
});
//   xdescribe('getFindAuthorizationFilter', () => {
//     const setOfAlertTypes = new Set([myAppAlertType, myOtherAppAlertType, mySecondAppAlertType]);

//     test('omits filter when there is no authorization api', async () => {
//       const racAuthorization = RacAuthorization.create({
//         request,
//         authorization,
//         features,
//         auditLogger,
//         getSpace,
//       });

//       const {
//         filter,
//         ensureAlertTypeIsAuthorized,
//       } = await racAuthorization.getFindAuthorizationFilter();

//       expect(() => ensureAlertTypeIsAuthorized('someMadeUpType', 'myApp')).not.toThrow();

//       expect(filter).toEqual(undefined);
//     });

//     test('ensureAlertTypeIsAuthorized is no-op when there is no authorization api', async () => {
//       const racAuthorization = RacAuthorization.create({
//         request,
//         authorization,
//         features,
//         auditLogger,
//         getSpace,
//       });

//       const { ensureAlertTypeIsAuthorized } = await racAuthorization.getFindAuthorizationFilter();

//       ensureAlertTypeIsAuthorized('someMadeUpType', 'myApp');

//       expect(auditLogger.racAuthorizationSuccess).not.toHaveBeenCalled();
//       expect(auditLogger.racAuthorizationFailure).not.toHaveBeenCalled();
//     });

//     test('creates a filter based on the privileged types', async () => {
//       const { authorization } = mockSecurity();
//       const checkPrivileges: jest.MockedFunction<
//         ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
//       > = jest.fn();
//       authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
//       checkPrivileges.mockResolvedValueOnce({
//         username: 'some-user',
//         hasAllRequested: true,
//         privileges: { kibana: [] },
//       });

//       const racAuthorization = RacAuthorization.create({
//         request,
//         authorization,
//         authoowners,
//         features,
//         auditLogger,
//         getSpace,
//       });
//       alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

//       // TODO: once issue https://github.com/elastic/kibana/issues/89473 is
//       // resolved, we can start using this code again, instead of toMatchSnapshot():
//       //
//       // expect((await racAuthorization.getFindAuthorizationFilter()).filter).toEqual(
//       //   esKuery.fromKueryExpression(
//       //     `((alert.attributes.alertTypeId:myAppAlertType and alert.attributes.consumer:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (alert.attributes.alertTypeId:myOtherAppAlertType and alert.attributes.consumer:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (alert.attributes.alertTypeId:mySecondAppAlertType and alert.attributes.consumer:(alerts or myApp or myOtherApp or myAppWithSubFeature)))`
//       //   )
//       // );

//       // This code is the replacement code for above
//       expect((await racAuthorization.getFindAuthorizationFilter()).filter).toMatchSnapshot();

//       expect(auditLogger.racAuthorizationSuccess).not.toHaveBeenCalled();
//     });

//     test('creates an `ensureAlertTypeIsAuthorized` function which throws if type is unauthorized', async () => {
//       const { authorization } = mockSecurity();
//       const checkPrivileges: jest.MockedFunction<
//         ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
//       > = jest.fn();
//       authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
//       checkPrivileges.mockResolvedValueOnce({
//         username: 'some-user',
//         hasAllRequested: false,
//         privileges: {
//           kibana: [
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'find'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'find'),
//               authorized: false,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'find'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'find'),
//               authorized: false,
//             },
//           ],
//         },
//       });

//       const racAuthorization = RacAuthorization.create({
//         request,
//         authorization,
//         authoowners,
//         features,
//         auditLogger,
//         getSpace,
//       });
//       alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

//       const { ensureAlertTypeIsAuthorized } = await racAuthorization.getFindAuthorizationFilter();
//       expect(() => {
//         ensureAlertTypeIsAuthorized('myAppAlertType', 'myOtherApp');
//       }).toThrowErrorMatchingInlineSnapshot(
//         `"Unauthorized to find a \\"myAppAlertType\\" alert for \\"myOtherApp\\""`
//       );

//       expect(auditLogger.racAuthorizationSuccess).not.toHaveBeenCalled();
//       expect(auditLogger.racAuthorizationFailure).toHaveBeenCalledTimes(1);
//       expect(auditLogger.racAuthorizationFailure.mock.calls[0]).toMatchInlineSnapshot(`
//         Array [
//           "some-user",
//           "myAppAlertType",
//           0,
//           "myOtherApp",
//           "find",
//         ]
//       `);
//     });

//     test('creates an `ensureAlertTypeIsAuthorized` function which is no-op if type is authorized', async () => {
//       const { authorization } = mockSecurity();
//       const checkPrivileges: jest.MockedFunction<
//         ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
//       > = jest.fn();
//       authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
//       checkPrivileges.mockResolvedValueOnce({
//         username: 'some-user',
//         hasAllRequested: false,
//         privileges: {
//           kibana: [
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'find'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'find'),
//               authorized: false,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'find'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'find'),
//               authorized: true,
//             },
//           ],
//         },
//       });

//       const racAuthorization = RacAuthorization.create({
//         request,
//         authorization,
//         authoowners,
//         features,
//         auditLogger,
//         getSpace,
//       });
//       alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

//       const { ensureAlertTypeIsAuthorized } = await racAuthorization.getFindAuthorizationFilter();
//       expect(() => {
//         ensureAlertTypeIsAuthorized('myAppAlertType', 'myOtherApp');
//       }).not.toThrow();

//       expect(auditLogger.racAuthorizationSuccess).not.toHaveBeenCalled();
//       expect(auditLogger.racAuthorizationFailure).not.toHaveBeenCalled();
//     });

//     test('creates an `logSuccessfulAuthorization` function which logs every authorized type', async () => {
//       const { authorization } = mockSecurity();
//       const checkPrivileges: jest.MockedFunction<
//         ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
//       > = jest.fn();
//       authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
//       checkPrivileges.mockResolvedValueOnce({
//         username: 'some-user',
//         hasAllRequested: false,
//         privileges: {
//           kibana: [
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'find'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'find'),
//               authorized: false,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'find'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'find'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('mySecondAppAlertType', 'myApp', 'find'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('mySecondAppAlertType', 'myOtherApp', 'find'),
//               authorized: true,
//             },
//           ],
//         },
//       });

//       const racAuthorization = RacAuthorization.create({
//         request,
//         authorization,
//         authoowners,
//         features,
//         auditLogger,
//         getSpace,
//       });
//       alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

//       const {
//         ensureAlertTypeIsAuthorized,
//         logSuccessfulAuthorization,
//       } = await racAuthorization.getFindAuthorizationFilter();
//       expect(() => {
//         ensureAlertTypeIsAuthorized('myAppAlertType', 'myOtherApp');
//         ensureAlertTypeIsAuthorized('mySecondAppAlertType', 'myOtherApp');
//         ensureAlertTypeIsAuthorized('myAppAlertType', 'myOtherApp');
//       }).not.toThrow();

//       expect(auditLogger.racAuthorizationSuccess).not.toHaveBeenCalled();
//       expect(auditLogger.racAuthorizationFailure).not.toHaveBeenCalled();

//       logSuccessfulAuthorization();

//       expect(auditLogger.alertsBulkAuthorizationSuccess).toHaveBeenCalledTimes(1);
//       expect(auditLogger.alertsBulkAuthorizationSuccess.mock.calls[0]).toMatchInlineSnapshot(`
//         Array [
//           "some-user",
//           Array [
//             Array [
//               "myAppAlertType",
//               "myOtherApp",
//             ],
//             Array [
//               "mySecondAppAlertType",
//               "myOtherApp",
//             ],
//           ],
//           0,
//           "find",
//         ]
//       `);
//     });
//   });

//   xdescribe('filterByAlertTypeAuthorization', () => {
//     const setOfAlertTypes = new Set([myAppAlertType, myOtherAppAlertType]);

//     test('augments a list of types with all features when there is no authorization api', async () => {
//       const racAuthorization = RacAuthorization.create({
//         request,
//         authorization,
//         features,
//         auditLogger,
//         getSpace,
//       });
//       alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

//       await expect(
//         racAuthorization.filterByAlertTypeAuthorization(
//           new Set([myAppAlertType, myOtherAppAlertType]),
//           [WriteOperations.Update]
//         )
//       ).resolves.toMatchInlineSnapshot(`
//               Set {
//                 Object {
//                   "actionGroups": Array [],
//                   "actionVariables": undefined,
//                   "authorizedConsumers": Object {
//                     "alerts": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                     "myApp": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                     "myAppWithSubFeature": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                     "myOtherApp": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                   },
//                   "defaultActionGroupId": "default",
//                   "enabledInLicense": true,
//                   "id": "myAppAlertType",
//                   "minimumLicenseRequired": "basic",
//                   "name": "myAppAlertType",
//                   "producer": "myApp",
//                   "recoveryActionGroup": Object {
//                     "id": "recovered",
//                     "name": "Recovered",
//                   },
//                 },
//                 Object {
//                   "actionGroups": Array [],
//                   "actionVariables": undefined,
//                   "authorizedConsumers": Object {
//                     "alerts": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                     "myApp": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                     "myAppWithSubFeature": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                     "myOtherApp": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                   },
//                   "defaultActionGroupId": "default",
//                   "enabledInLicense": true,
//                   "id": "myOtherAppAlertType",
//                   "minimumLicenseRequired": "basic",
//                   "name": "myOtherAppAlertType",
//                   "producer": "myOtherApp",
//                   "recoveryActionGroup": Object {
//                     "id": "recovered",
//                     "name": "Recovered",
//                   },
//                 },
//               }
//             `);
//     });

//     test('augments a list of types with consumers under which the operation is authorized', async () => {
//       const { authorization } = mockSecurity();
//       const checkPrivileges: jest.MockedFunction<
//         ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
//       > = jest.fn();
//       authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
//       checkPrivileges.mockResolvedValueOnce({
//         username: 'some-user',
//         hasAllRequested: false,
//         privileges: {
//           kibana: [
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'create'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'create'),
//               authorized: false,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'create'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'create'),
//               authorized: true,
//             },
//           ],
//         },
//       });

//       const racAuthorization = RacAuthorization.create({
//         request,
//         authorization,
//         authoowners,
//         features,
//         auditLogger,
//         getSpace,
//       });
//       alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

//       await expect(
//         racAuthorization.filterByAlertTypeAuthorization(
//           new Set([myAppAlertType, myOtherAppAlertType]),
//           [WriteOperations.Update]
//         )
//       ).resolves.toMatchInlineSnapshot(`
//               Set {
//                 Object {
//                   "actionGroups": Array [],
//                   "actionVariables": undefined,
//                   "authorizedConsumers": Object {
//                     "myApp": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                   },
//                   "defaultActionGroupId": "default",
//                   "enabledInLicense": true,
//                   "id": "myOtherAppAlertType",
//                   "minimumLicenseRequired": "basic",
//                   "name": "myOtherAppAlertType",
//                   "producer": "myOtherApp",
//                   "recoveryActionGroup": Object {
//                     "id": "recovered",
//                     "name": "Recovered",
//                   },
//                 },
//                 Object {
//                   "actionGroups": Array [],
//                   "actionVariables": undefined,
//                   "authorizedConsumers": Object {
//                     "alerts": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                     "myApp": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                     "myOtherApp": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                   },
//                   "defaultActionGroupId": "default",
//                   "enabledInLicense": true,
//                   "id": "myAppAlertType",
//                   "minimumLicenseRequired": "basic",
//                   "name": "myAppAlertType",
//                   "producer": "myApp",
//                   "recoveryActionGroup": Object {
//                     "id": "recovered",
//                     "name": "Recovered",
//                   },
//                 },
//               }
//             `);
//     });

//     test('authorizes user under the Alerts consumer when they are authorized by the producer', async () => {
//       const { authorization } = mockSecurity();
//       const checkPrivileges: jest.MockedFunction<
//         ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
//       > = jest.fn();
//       authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
//       checkPrivileges.mockResolvedValueOnce({
//         username: 'some-user',
//         hasAllRequested: false,
//         privileges: {
//           kibana: [
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'create'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'create'),
//               authorized: false,
//             },
//           ],
//         },
//       });

//       const racAuthorization = RacAuthorization.create({
//         request,
//         authorization,
//         authoowners,
//         features,
//         auditLogger,
//         getSpace,
//       });
//       alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

//       await expect(
//         racAuthorization.filterByAlertTypeAuthorization(new Set([myAppAlertType]), [
//           WriteOperations.Update,
//         ])
//       ).resolves.toMatchInlineSnapshot(`
//               Set {
//                 Object {
//                   "actionGroups": Array [],
//                   "actionVariables": undefined,
//                   "authorizedConsumers": Object {
//                     "alerts": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                     "myApp": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                   },
//                   "defaultActionGroupId": "default",
//                   "enabledInLicense": true,
//                   "id": "myAppAlertType",
//                   "minimumLicenseRequired": "basic",
//                   "name": "myAppAlertType",
//                   "producer": "myApp",
//                   "recoveryActionGroup": Object {
//                     "id": "recovered",
//                     "name": "Recovered",
//                   },
//                 },
//               }
//             `);
//     });

//     test('augments a list of types with consumers under which multiple operations are authorized', async () => {
//       const { authorization } = mockSecurity();
//       const checkPrivileges: jest.MockedFunction<
//         ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
//       > = jest.fn();
//       authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
//       checkPrivileges.mockResolvedValueOnce({
//         username: 'some-user',
//         hasAllRequested: false,
//         privileges: {
//           kibana: [
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'create'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'create'),
//               authorized: false,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'create'),
//               authorized: false,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'create'),
//               authorized: false,
//             },
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'get'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'get'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'get'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'get'),
//               authorized: true,
//             },
//           ],
//         },
//       });

//       const racAuthorization = RacAuthorization.create({
//         request,
//         authorization,
//         authoowners,
//         features,
//         auditLogger,
//         getSpace,
//       });
//       alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

//       await expect(
//         racAuthorization.filterByAlertTypeAuthorization(
//           new Set([myAppAlertType, myOtherAppAlertType]),
//           [WriteOperations.Update, ReadOperations.Get]
//         )
//       ).resolves.toMatchInlineSnapshot(`
//               Set {
//                 Object {
//                   "actionGroups": Array [],
//                   "actionVariables": undefined,
//                   "authorizedConsumers": Object {
//                     "alerts": Object {
//                       "all": false,
//                       "read": true,
//                     },
//                     "myApp": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                     "myOtherApp": Object {
//                       "all": false,
//                       "read": true,
//                     },
//                   },
//                   "defaultActionGroupId": "default",
//                   "enabledInLicense": true,
//                   "id": "myOtherAppAlertType",
//                   "minimumLicenseRequired": "basic",
//                   "name": "myOtherAppAlertType",
//                   "producer": "myOtherApp",
//                   "recoveryActionGroup": Object {
//                     "id": "recovered",
//                     "name": "Recovered",
//                   },
//                 },
//                 Object {
//                   "actionGroups": Array [],
//                   "actionVariables": undefined,
//                   "authorizedConsumers": Object {
//                     "alerts": Object {
//                       "all": false,
//                       "read": true,
//                     },
//                     "myApp": Object {
//                       "all": false,
//                       "read": true,
//                     },
//                     "myOtherApp": Object {
//                       "all": false,
//                       "read": true,
//                     },
//                   },
//                   "defaultActionGroupId": "default",
//                   "enabledInLicense": true,
//                   "id": "myAppAlertType",
//                   "minimumLicenseRequired": "basic",
//                   "name": "myAppAlertType",
//                   "producer": "myApp",
//                   "recoveryActionGroup": Object {
//                     "id": "recovered",
//                     "name": "Recovered",
//                   },
//                 },
//               }
//             `);
//     });

//     test('omits types which have no consumers under which the operation is authorized', async () => {
//       const { authorization } = mockSecurity();
//       const checkPrivileges: jest.MockedFunction<
//         ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
//       > = jest.fn();
//       authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
//       checkPrivileges.mockResolvedValueOnce({
//         username: 'some-user',
//         hasAllRequested: false,
//         privileges: {
//           kibana: [
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'create'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myOtherAppAlertType', 'myOtherApp', 'create'),
//               authorized: true,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'create'),
//               authorized: false,
//             },
//             {
//               privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'create'),
//               authorized: false,
//             },
//           ],
//         },
//       });

//       const racAuthorization = RacAuthorization.create({
//         request,
//         authorization,
//         authoowners,
//         features,
//         auditLogger,
//         getSpace,
//       });
//       alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);

//       await expect(
//         racAuthorization.filterByAlertTypeAuthorization(
//           new Set([myAppAlertType, myOtherAppAlertType]),
//           [WriteOperations.Update]
//         )
//       ).resolves.toMatchInlineSnapshot(`
//               Set {
//                 Object {
//                   "actionGroups": Array [],
//                   "actionVariables": undefined,
//                   "authorizedConsumers": Object {
//                     "alerts": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                     "myApp": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                     "myOtherApp": Object {
//                       "all": true,
//                       "read": true,
//                     },
//                   },
//                   "defaultActionGroupId": "default",
//                   "enabledInLicense": true,
//                   "id": "myOtherAppAlertType",
//                   "minimumLicenseRequired": "basic",
//                   "name": "myOtherAppAlertType",
//                   "producer": "myOtherApp",
//                   "recoveryActionGroup": Object {
//                     "id": "recovered",
//                     "name": "Recovered",
//                   },
//                 },
//               }
//             `);
//     });
//   });
// });
