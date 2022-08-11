/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { KibanaRequest } from '@kbn/core/server';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import {
  PluginStartContract as FeaturesStartContract,
  KibanaFeature,
} from '@kbn/features-plugin/server';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import {
  AlertingAuthorization,
  WriteOperations,
  ReadOperations,
  AlertingAuthorizationEntity,
} from './alerting_authorization';
import uuid from 'uuid';
import { RecoveredActionGroup } from '../../common';
import { RegistryRuleType } from '../rule_type_registry';
import { AlertingAuthorizationFilterType } from './alerting_authorization_kuery';

const ruleTypeRegistry = ruleTypeRegistryMock.create();
const features: jest.Mocked<FeaturesStartContract> = featuresPluginMock.createStart();
const request = {} as KibanaRequest;

const getSpace = jest.fn();
const getSpaceId = () => 'space1';

const mockAuthorizationAction = (
  type: string,
  app: string,
  alertingType: string,
  operation: string
) => `${type}/${app}/${alertingType}/${operation}`;
function mockSecurity() {
  const security = securityMock.createSetup();
  const authorization = security.authz;
  // typescript is having trouble inferring jest's automocking
  (
    authorization.actions.alerting.get as jest.MockedFunction<
      typeof authorization.actions.alerting.get
    >
  ).mockImplementation(mockAuthorizationAction);
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
                rule: {
                  all: [typeName],
                },
                alert: {
                  all: [typeName],
                },
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
                rule: {
                  read: [typeName],
                },
                alert: {
                  read: [typeName],
                },
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
                  rule: {
                    all: [typeName],
                  },
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
                  rule: {
                    read: [typeName],
                  },
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
  ruleTypeRegistry.get.mockImplementation((id) => ({
    id,
    name: 'My Alert Type',
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    recoveryActionGroup: RecoveredActionGroup,
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

describe('AlertingAuthorization', () => {
  describe('constructor', () => {
    test(`fetches the user's current space`, async () => {
      const space = {
        id: uuid.v4(),
        name: uuid.v4(),
        disabledFeatures: [],
      };
      getSpace.mockResolvedValue(space);

      new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });

      expect(getSpace).toHaveBeenCalledWith(request);
    });
  });

  describe('ensureAuthorized', () => {
    test('is a no-op when there is no authorization api', async () => {
      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });

      await alertAuthorization.ensureAuthorized({
        ruleTypeId: 'myType',
        consumer: 'myApp',
        operation: WriteOperations.Create,
        entity: AlertingAuthorizationEntity.Rule,
      });

      expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(0);
    });

    test('is a no-op when the security license is disabled', async () => {
      const { authorization } = mockSecurity();
      authorization.mode.useRbacForRequest.mockReturnValue(false);
      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        authorization,
        features,
        getSpace,
        getSpaceId,
      });

      await alertAuthorization.ensureAuthorized({
        ruleTypeId: 'myType',
        consumer: 'myApp',
        operation: WriteOperations.Create,
        entity: AlertingAuthorizationEntity.Rule,
      });

      expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(0);
    });

    test('ensures the user has privileges to execute rules for the specified rule type and operation without consumer when producer and consumer are the same', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });

      await alertAuthorization.ensureAuthorized({
        ruleTypeId: 'myType',
        consumer: 'myApp',
        operation: WriteOperations.Create,
        entity: AlertingAuthorizationEntity.Rule,
      });

      expect(ruleTypeRegistry.get).toHaveBeenCalledWith('myType');

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(2);
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'rule',
        'create'
      );
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [mockAuthorizationAction('myType', 'myApp', 'rule', 'create')],
      });
    });

    test('ensures the user has privileges to execute alerts for the specified rule type and operation without consumer when producer and consumer are the same', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });

      await alertAuthorization.ensureAuthorized({
        ruleTypeId: 'myType',
        consumer: 'myApp',
        operation: WriteOperations.Update,
        entity: AlertingAuthorizationEntity.Alert,
      });

      expect(ruleTypeRegistry.get).toHaveBeenCalledWith('myType');

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(2);
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'alert',
        'update'
      );
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [mockAuthorizationAction('myType', 'myApp', 'alert', 'update')],
      });
    });

    test('ensures the user has privileges to execute rules for the specified rule type and operation without consumer when consumer is alerts', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });

      await alertAuthorization.ensureAuthorized({
        ruleTypeId: 'myType',
        consumer: 'alerts',
        operation: WriteOperations.Create,
        entity: AlertingAuthorizationEntity.Rule,
      });

      expect(ruleTypeRegistry.get).toHaveBeenCalledWith('myType');

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(2);
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'alerts',
        'rule',
        'create'
      );
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'rule',
        'create'
      );
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [mockAuthorizationAction('myType', 'myApp', 'rule', 'create')],
      });
    });

    test('ensures the user has privileges to execute alerts for the specified rule type and operation without consumer when consumer is alerts', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });

      await alertAuthorization.ensureAuthorized({
        ruleTypeId: 'myType',
        consumer: 'alerts',
        operation: WriteOperations.Update,
        entity: AlertingAuthorizationEntity.Alert,
      });

      expect(ruleTypeRegistry.get).toHaveBeenCalledWith('myType');

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(2);
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'alerts',
        'alert',
        'update'
      );
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'alert',
        'update'
      );
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [mockAuthorizationAction('myType', 'myApp', 'alert', 'update')],
      });
    });

    test('ensures the user has privileges to execute rules for the specified rule type, operation and producer when producer is different from consumer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });

      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });

      await alertAuthorization.ensureAuthorized({
        ruleTypeId: 'myType',
        consumer: 'myOtherApp',
        operation: WriteOperations.Create,
        entity: AlertingAuthorizationEntity.Rule,
      });

      expect(ruleTypeRegistry.get).toHaveBeenCalledWith('myType');

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(2);
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'rule',
        'create'
      );
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'myOtherApp',
        'rule',
        'create'
      );
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [
          mockAuthorizationAction('myType', 'myOtherApp', 'rule', 'create'),
          mockAuthorizationAction('myType', 'myApp', 'rule', 'create'),
        ],
      });
    });

    test('ensures the user has privileges to execute alerts for the specified rule type, operation and producer when producer is different from consumer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });

      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });

      await alertAuthorization.ensureAuthorized({
        ruleTypeId: 'myType',
        consumer: 'myOtherApp',
        operation: WriteOperations.Update,
        entity: AlertingAuthorizationEntity.Alert,
      });

      expect(ruleTypeRegistry.get).toHaveBeenCalledWith('myType');

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(2);
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'alert',
        'update'
      );
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'myOtherApp',
        'alert',
        'update'
      );
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [
          mockAuthorizationAction('myType', 'myOtherApp', 'alert', 'update'),
          mockAuthorizationAction('myType', 'myApp', 'alert', 'update'),
        ],
      });
    });

    test('throws if user lacks the required rule privileges for the consumer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myType', 'myOtherApp', 'rule', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myType', 'myApp', 'rule', 'create'),
              authorized: true,
            },
          ],
        },
      });

      await expect(
        alertAuthorization.ensureAuthorized({
          ruleTypeId: 'myType',
          consumer: 'myOtherApp',
          operation: WriteOperations.Create,
          entity: AlertingAuthorizationEntity.Rule,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to create a \\"myType\\" rule for \\"myOtherApp\\""`
      );
    });

    test('throws if user lacks the required alert privileges for the consumer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myType', 'myOtherApp', 'alert', 'update'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myType', 'myApp', 'alert', 'update'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myType', 'myAppRulesOnly', 'alert', 'update'),
              authorized: false,
            },
          ],
        },
      });

      await expect(
        alertAuthorization.ensureAuthorized({
          ruleTypeId: 'myType',
          consumer: 'myAppRulesOnly',
          operation: WriteOperations.Update,
          entity: AlertingAuthorizationEntity.Alert,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to update a \\"myType\\" alert for \\"myAppRulesOnly\\""`
      );
    });

    test('throws if user lacks the required privileges for the producer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myType', 'myOtherApp', 'alert', 'update'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myType', 'myApp', 'alert', 'update'),
              authorized: false,
            },
          ],
        },
      });

      await expect(
        alertAuthorization.ensureAuthorized({
          ruleTypeId: 'myType',
          consumer: 'myOtherApp',
          operation: WriteOperations.Update,
          entity: AlertingAuthorizationEntity.Alert,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to update a \\"myType\\" alert by \\"myApp\\""`
      );
    });

    test('throws if user lacks the required privileges for both consumer and producer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myType', 'myOtherApp', 'alert', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myType', 'myApp', 'alert', 'create'),
              authorized: false,
            },
          ],
        },
      });

      await expect(
        alertAuthorization.ensureAuthorized({
          ruleTypeId: 'myType',
          consumer: 'myOtherApp',
          operation: WriteOperations.Create,
          entity: AlertingAuthorizationEntity.Alert,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to create a \\"myType\\" alert for \\"myOtherApp\\""`
      );
    });
  });

  describe('getFindAuthorizationFilter', () => {
    const myOtherAppAlertType: RegistryRuleType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      recoveryActionGroup: RecoveredActionGroup,
      id: 'myOtherAppAlertType',
      name: 'myOtherAppAlertType',
      producer: 'alerts',
      enabledInLicense: true,
    };
    const myAppAlertType: RegistryRuleType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      recoveryActionGroup: RecoveredActionGroup,
      id: 'myAppAlertType',
      name: 'myAppAlertType',
      producer: 'myApp',
      enabledInLicense: true,
    };
    const mySecondAppAlertType: RegistryRuleType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      recoveryActionGroup: RecoveredActionGroup,
      id: 'mySecondAppAlertType',
      name: 'mySecondAppAlertType',
      producer: 'myApp',
      enabledInLicense: true,
    };
    const setOfAlertTypes = new Set([myAppAlertType, myOtherAppAlertType, mySecondAppAlertType]);
    test('omits filter when there is no authorization api', async () => {
      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      const { filter, ensureRuleTypeIsAuthorized } =
        await alertAuthorization.getFindAuthorizationFilter(AlertingAuthorizationEntity.Rule, {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'ruleId',
            consumer: 'consumer',
          },
        });
      expect(() => ensureRuleTypeIsAuthorized('someMadeUpType', 'myApp', 'rule')).not.toThrow();
      expect(filter).toEqual(undefined);
    });
    test('ensureRuleTypeIsAuthorized is no-op when there is no authorization api', async () => {
      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      const { ensureRuleTypeIsAuthorized } = await alertAuthorization.getFindAuthorizationFilter(
        AlertingAuthorizationEntity.Rule,
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'ruleId',
            consumer: 'consumer',
          },
        }
      );
      ensureRuleTypeIsAuthorized('someMadeUpType', 'myApp', 'rule');
    });
    test('creates a filter based on the privileged types', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: { kibana: [] },
      });
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);
      expect(
        (
          await alertAuthorization.getFindAuthorizationFilter(AlertingAuthorizationEntity.Rule, {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'path.to.rule_type_id',
              consumer: 'consumer-field',
            },
          })
        ).filter
      ).toEqual(
        fromKueryExpression(
          `((path.to.rule_type_id:myAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (path.to.rule_type_id:myOtherAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (path.to.rule_type_id:mySecondAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)))`
        )
      );
    });
    test('throws if user has no privileges to any rule type', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myType', 'myOtherApp', 'rule', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myType', 'myApp', 'rule', 'create'),
              authorized: false,
            },
          ],
        },
      });
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);
      await expect(
        alertAuthorization.getFindAuthorizationFilter(AlertingAuthorizationEntity.Rule, {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to find rules for any rule types"`
      );
    });
    test('creates an `ensureRuleTypeIsAuthorized` function which throws if type is unauthorized', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'alert', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction(
                'myOtherAppAlertType',
                'myOtherApp',
                'alert',
                'find'
              ),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'alert', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'alert', 'find'),
              authorized: false,
            },
          ],
        },
      });
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);
      const { ensureRuleTypeIsAuthorized } = await alertAuthorization.getFindAuthorizationFilter(
        AlertingAuthorizationEntity.Alert,
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'ruleId',
            consumer: 'consumer',
          },
        }
      );
      expect(() => {
        ensureRuleTypeIsAuthorized('myAppAlertType', 'myOtherApp', 'alert');
      }).toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized to find a \\"myAppAlertType\\" alert for \\"myOtherApp\\""`
      );
    });
    test('creates an `ensureRuleTypeIsAuthorized` function which is no-op if type is authorized', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction(
                'myOtherAppAlertType',
                'myOtherApp',
                'rule',
                'find'
              ),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'rule', 'find'),
              authorized: true,
            },
          ],
        },
      });
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);
      const { ensureRuleTypeIsAuthorized } = await alertAuthorization.getFindAuthorizationFilter(
        AlertingAuthorizationEntity.Rule,
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'ruleId',
            consumer: 'consumer',
          },
        }
      );
      expect(() => {
        ensureRuleTypeIsAuthorized('myAppAlertType', 'myOtherApp', 'rule');
      }).not.toThrow();
    });
    test('creates an `logSuccessfulAuthorization` function which logs every authorized type', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction(
                'myOtherAppAlertType',
                'myOtherApp',
                'rule',
                'find'
              ),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('mySecondAppAlertType', 'myApp', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction(
                'mySecondAppAlertType',
                'myOtherApp',
                'rule',
                'find'
              ),
              authorized: true,
            },
          ],
        },
      });
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);
      const { ensureRuleTypeIsAuthorized } = await alertAuthorization.getFindAuthorizationFilter(
        AlertingAuthorizationEntity.Rule,
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'ruleId',
            consumer: 'consumer',
          },
        }
      );
      expect(() => {
        ensureRuleTypeIsAuthorized('myAppAlertType', 'myOtherApp', 'rule');
        ensureRuleTypeIsAuthorized('mySecondAppAlertType', 'myOtherApp', 'rule');
        ensureRuleTypeIsAuthorized('myAppAlertType', 'myOtherApp', 'rule');
      }).not.toThrow();
    });

    // This is a specific use case currently for alerts as data
    // Space ids are stored in the alerts documents and even if security is disabled
    // still need to consider the users space privileges
    test('creates a spaceId only filter if security is disabled, but require space awareness', async () => {
      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      const { filter } = await alertAuthorization.getFindAuthorizationFilter(
        AlertingAuthorizationEntity.Alert,
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'ruleId',
            consumer: 'consumer',
            spaceIds: 'path.to.space.id',
          },
        }
      );

      expect(filter).toEqual({
        bool: { minimum_should_match: 1, should: [{ match: { 'path.to.space.id': 'space1' } }] },
      });
    });
  });

  describe('filterByRuleTypeAuthorization', () => {
    const myOtherAppAlertType: RegistryRuleType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      recoveryActionGroup: RecoveredActionGroup,
      id: 'myOtherAppAlertType',
      name: 'myOtherAppAlertType',
      producer: 'myOtherApp',
      enabledInLicense: true,
    };
    const myAppAlertType: RegistryRuleType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      recoveryActionGroup: RecoveredActionGroup,
      id: 'myAppAlertType',
      name: 'myAppAlertType',
      producer: 'myApp',
      enabledInLicense: true,
    };
    const setOfAlertTypes = new Set([myAppAlertType, myOtherAppAlertType]);

    test('augments a list of types with all features when there is no authorization api', async () => {
      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      await expect(
        alertAuthorization.filterByRuleTypeAuthorization(
          new Set([myAppAlertType, myOtherAppAlertType]),
          [WriteOperations.Create],
          AlertingAuthorizationEntity.Rule
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
                  "enabledInLicense": true,
                  "id": "myAppAlertType",
                  "isExportable": true,
                  "minimumLicenseRequired": "basic",
                  "name": "myAppAlertType",
                  "producer": "myApp",
                  "recoveryActionGroup": Object {
                    "id": "recovered",
                    "name": "Recovered",
                  },
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
                  "enabledInLicense": true,
                  "id": "myOtherAppAlertType",
                  "isExportable": true,
                  "minimumLicenseRequired": "basic",
                  "name": "myOtherAppAlertType",
                  "producer": "myOtherApp",
                  "recoveryActionGroup": Object {
                    "id": "recovered",
                    "name": "Recovered",
                  },
                },
              }
            `);
    });

    test('augments a list of types with consumers under which the operation is authorized', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'rule', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction(
                'myOtherAppAlertType',
                'myOtherApp',
                'rule',
                'create'
              ),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'rule', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'rule', 'create'),
              authorized: true,
            },
          ],
        },
      });

      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      await expect(
        alertAuthorization.filterByRuleTypeAuthorization(
          new Set([myAppAlertType, myOtherAppAlertType]),
          [WriteOperations.Create],
          AlertingAuthorizationEntity.Rule
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
                    "enabledInLicense": true,
                    "id": "myOtherAppAlertType",
                    "isExportable": true,
                    "minimumLicenseRequired": "basic",
                    "name": "myOtherAppAlertType",
                    "producer": "myOtherApp",
                    "recoveryActionGroup": Object {
                      "id": "recovered",
                      "name": "Recovered",
                    },
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
                    "enabledInLicense": true,
                    "id": "myAppAlertType",
                    "isExportable": true,
                    "minimumLicenseRequired": "basic",
                    "name": "myAppAlertType",
                    "producer": "myApp",
                    "recoveryActionGroup": Object {
                      "id": "recovered",
                      "name": "Recovered",
                    },
                  },
                }
              `);
    });

    test('authorizes user under the `alerts` consumer when they are authorized by the producer', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'alert', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'alert', 'create'),
              authorized: false,
            },
          ],
        },
      });

      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      await expect(
        alertAuthorization.filterByRuleTypeAuthorization(
          new Set([myAppAlertType]),
          [WriteOperations.Create],
          AlertingAuthorizationEntity.Alert
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
                    },
                    "defaultActionGroupId": "default",
                    "enabledInLicense": true,
                    "id": "myAppAlertType",
                    "isExportable": true,
                    "minimumLicenseRequired": "basic",
                    "name": "myAppAlertType",
                    "producer": "myApp",
                    "recoveryActionGroup": Object {
                      "id": "recovered",
                      "name": "Recovered",
                    },
                  },
                }
              `);
    });

    test('augments a list of types with consumers under which multiple operations are authorized', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'alert', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction(
                'myOtherAppAlertType',
                'myOtherApp',
                'alert',
                'create'
              ),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'alert', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'alert', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'alert', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction(
                'myOtherAppAlertType',
                'myOtherApp',
                'alert',
                'get'
              ),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'alert', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'alert', 'get'),
              authorized: true,
            },
          ],
        },
      });

      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      await expect(
        alertAuthorization.filterByRuleTypeAuthorization(
          new Set([myAppAlertType, myOtherAppAlertType]),
          [WriteOperations.Create, ReadOperations.Get],
          AlertingAuthorizationEntity.Alert
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
                    "enabledInLicense": true,
                    "id": "myOtherAppAlertType",
                    "isExportable": true,
                    "minimumLicenseRequired": "basic",
                    "name": "myOtherAppAlertType",
                    "producer": "myOtherApp",
                    "recoveryActionGroup": Object {
                      "id": "recovered",
                      "name": "Recovered",
                    },
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
                    "enabledInLicense": true,
                    "id": "myAppAlertType",
                    "isExportable": true,
                    "minimumLicenseRequired": "basic",
                    "name": "myAppAlertType",
                    "producer": "myApp",
                    "recoveryActionGroup": Object {
                      "id": "recovered",
                      "name": "Recovered",
                    },
                  },
                }
              `);
    });

    test('omits types which have no consumers under which the operation is authorized', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'alert', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction(
                'myOtherAppAlertType',
                'myOtherApp',
                'alert',
                'create'
              ),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myApp', 'alert', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('myAppAlertType', 'myOtherApp', 'alert', 'create'),
              authorized: false,
            },
          ],
        },
      });

      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      await expect(
        alertAuthorization.filterByRuleTypeAuthorization(
          new Set([myAppAlertType, myOtherAppAlertType]),
          [WriteOperations.Create],
          AlertingAuthorizationEntity.Alert
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
                    "enabledInLicense": true,
                    "id": "myOtherAppAlertType",
                    "isExportable": true,
                    "minimumLicenseRequired": "basic",
                    "name": "myOtherAppAlertType",
                    "producer": "myOtherApp",
                    "recoveryActionGroup": Object {
                      "id": "recovered",
                      "name": "Recovered",
                    },
                  },
                }
              `);
    });
  });

  describe('getAugmentedRuleTypesWithAuthorization', () => {
    const myOtherAppAlertType: RegistryRuleType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      recoveryActionGroup: RecoveredActionGroup,
      id: 'myOtherAppAlertType',
      name: 'myOtherAppAlertType',
      producer: 'alerts',
      enabledInLicense: true,
      isExportable: true,
    };
    const myAppAlertType: RegistryRuleType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      recoveryActionGroup: RecoveredActionGroup,
      id: 'myAppAlertType',
      name: 'myAppAlertType',
      producer: 'myApp',
      enabledInLicense: true,
      isExportable: true,
    };
    const mySecondAppAlertType: RegistryRuleType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      recoveryActionGroup: RecoveredActionGroup,
      id: 'mySecondAppAlertType',
      name: 'mySecondAppAlertType',
      producer: 'myApp',
      enabledInLicense: true,
      isExportable: true,
    };
    const setOfAlertTypes = new Set([myAppAlertType, myOtherAppAlertType, mySecondAppAlertType]);

    test('it returns authorized rule types given a set of feature ids', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'alert', 'find'),
              authorized: true,
            },
          ],
        },
      });
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      await expect(
        alertAuthorization.getAugmentedRuleTypesWithAuthorization(
          ['myApp'],
          [ReadOperations.Find, ReadOperations.Get, WriteOperations.Update],
          AlertingAuthorizationEntity.Alert
        )
      ).resolves.toMatchInlineSnapshot(`
              Object {
                "authorizedRuleTypes": Set {
                  Object {
                    "actionGroups": Array [],
                    "actionVariables": undefined,
                    "authorizedConsumers": Object {
                      "myApp": Object {
                        "all": false,
                        "read": true,
                      },
                    },
                    "defaultActionGroupId": "default",
                    "enabledInLicense": true,
                    "id": "myOtherAppAlertType",
                    "isExportable": true,
                    "minimumLicenseRequired": "basic",
                    "name": "myOtherAppAlertType",
                    "producer": "alerts",
                    "recoveryActionGroup": Object {
                      "id": "recovered",
                      "name": "Recovered",
                    },
                  },
                },
                "hasAllRequested": false,
                "username": "some-user",
              }
            `);
    });

    test('it returns all authorized if user has read, get and update alert privileges', async () => {
      const { authorization } = mockSecurity();
      const checkPrivileges: jest.MockedFunction<
        ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
      > = jest.fn();
      authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: false,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'alert', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'alert', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('myOtherAppAlertType', 'myApp', 'alert', 'update'),
              authorized: true,
            },
          ],
        },
      });
      const alertAuthorization = new AlertingAuthorization({
        request,
        authorization,
        ruleTypeRegistry,
        features,
        getSpace,
        getSpaceId,
      });
      ruleTypeRegistry.list.mockReturnValue(setOfAlertTypes);

      await expect(
        alertAuthorization.getAugmentedRuleTypesWithAuthorization(
          ['myApp'],
          [ReadOperations.Find, ReadOperations.Get, WriteOperations.Update],
          AlertingAuthorizationEntity.Alert
        )
      ).resolves.toMatchInlineSnapshot(`
              Object {
                "authorizedRuleTypes": Set {
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
                    "enabledInLicense": true,
                    "id": "myOtherAppAlertType",
                    "isExportable": true,
                    "minimumLicenseRequired": "basic",
                    "name": "myOtherAppAlertType",
                    "producer": "alerts",
                    "recoveryActionGroup": Object {
                      "id": "recovered",
                      "name": "Recovered",
                    },
                  },
                },
                "hasAllRequested": false,
                "username": "some-user",
              }
            `);
    });
  });
});
