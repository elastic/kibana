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
  FeaturesPluginStart as FeaturesStartContract,
  KibanaFeature,
} from '@kbn/features-plugin/server';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import {
  AlertingAuthorization,
  WriteOperations,
  ReadOperations,
  AlertingAuthorizationEntity,
} from './alerting_authorization';
import { v4 as uuidv4 } from 'uuid';
import { RecoveredActionGroup } from '../../common';
import { NormalizedRuleType, RegistryRuleType } from '../rule_type_registry';
import { AlertingAuthorizationFilterType } from './alerting_authorization_kuery';
import { schema } from '@kbn/config-schema';

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

function mockFeature(appName: string, typeName?: string | string[]) {
  const typeNameArray = typeName ? (Array.isArray(typeName) ? typeName : [typeName]) : undefined;
  return new KibanaFeature({
    id: appName,
    name: appName,
    app: [],
    category: { id: 'foo', label: 'foo' },
    ...(typeNameArray
      ? {
          alerting: typeNameArray,
        }
      : {}),
    privileges: {
      all: {
        ...(typeNameArray
          ? {
              alerting: {
                rule: {
                  all: typeNameArray,
                },
                alert: {
                  all: typeNameArray,
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
        ...(typeNameArray
          ? {
              alerting: {
                rule: {
                  read: typeNameArray,
                },
                alert: {
                  read: typeNameArray,
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
    async executor() {
      return { state: {} };
    },
    category: 'test',
    producer: 'myApp',
    validate: {
      params: schema.any(),
    },
    validLegacyConsumers: [],
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
        id: uuidv4(),
        name: uuidv4(),
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

      expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
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

      expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
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

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(1);
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

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(1);
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

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(1);
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

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(1);
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

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(1);
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'myOtherApp',
        'rule',
        'create'
      );
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [mockAuthorizationAction('myType', 'myOtherApp', 'rule', 'create')],
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

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(1);
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'myOtherApp',
        'alert',
        'update'
      );
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [mockAuthorizationAction('myType', 'myOtherApp', 'alert', 'update')],
      });
    });

    test('ensures the producer is used for authorization if the consumer is `alerts`', async () => {
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
        consumer: 'alerts',
        operation: WriteOperations.Create,
        entity: AlertingAuthorizationEntity.Rule,
      });

      expect(ruleTypeRegistry.get).toHaveBeenCalledWith('myType');

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(1);
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
        `"Unauthorized by \\"myOtherApp\\" to create \\"myType\\" rule"`
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
        `"Unauthorized by \\"myAppRulesOnly\\" to update \\"myType\\" alert"`
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
        `"Unauthorized by \\"myOtherApp\\" to update \\"myType\\" alert"`
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
        `"Unauthorized by \\"myOtherApp\\" to create \\"myType\\" alert"`
      );
    });

    test('checks additional privileges correctly', async () => {
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
        additionalPrivileges: ['test/create'],
      });

      expect(ruleTypeRegistry.get).toHaveBeenCalledWith('myType');

      expect(authorization.actions.alerting.get).toHaveBeenCalledTimes(1);
      expect(authorization.actions.alerting.get).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'rule',
        'create'
      );
      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [mockAuthorizationAction('myType', 'myApp', 'rule', 'create'), 'test/create'],
      });
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
      category: 'test',
      producer: 'alerts',
      enabledInLicense: true,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      validLegacyConsumers: [],
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
      category: 'test',
      producer: 'myApp',
      enabledInLicense: true,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      validLegacyConsumers: [],
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
      category: 'test',
      producer: 'myApp',
      enabledInLicense: true,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      validLegacyConsumers: [],
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
      features.getKibanaFeatures.mockReturnValue([
        mockFeature('myApp', ['myAppAlertType', 'mySecondAppAlertType']),
        mockFeature('alerts', 'myOtherAppAlertType'),
        myOtherAppFeature,
        myAppWithSubFeature,
      ]);
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
          `((path.to.rule_type_id:myAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (path.to.rule_type_id:mySecondAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)) or (path.to.rule_type_id:myOtherAppAlertType and consumer-field:(alerts or myApp or myOtherApp or myAppWithSubFeature)))`
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
      features.getKibanaFeatures.mockReturnValue([
        mockFeature('myApp', ['myOtherAppAlertType', 'myAppAlertType']),
        mockFeature('myOtherApp', ['myOtherAppAlertType', 'myAppAlertType']),
      ]);
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
        `"Unauthorized by \\"myOtherApp\\" to find \\"myAppAlertType\\" alert"`
      );
    });
    test('creates an `ensureRuleTypeIsAuthorized` function which is no-op if type is authorized', async () => {
      features.getKibanaFeatures.mockReturnValue([
        mockFeature('myApp', ['myOtherAppAlertType', 'myAppAlertType']),
        mockFeature('myOtherApp', 'myAppAlertType'),
      ]);
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
      features.getKibanaFeatures.mockReturnValue([
        mockFeature('myApp', ['myOtherAppAlertType', 'myAppAlertType', 'mySecondAppAlertType']),
        mockFeature('myOtherApp', ['mySecondAppAlertType', 'myAppAlertType']),
      ]);
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
      category: 'test',
      producer: 'myOtherApp',
      enabledInLicense: true,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      validLegacyConsumers: [],
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
      category: 'test',
      producer: 'myApp',
      enabledInLicense: true,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      validLegacyConsumers: [],
    };
    const setOfAlertTypes = new Set([myAppAlertType, myOtherAppAlertType]);
    beforeEach(() => {
      features.getKibanaFeatures.mockReturnValue([
        mockFeature('myApp', ['myOtherAppAlertType', 'myAppAlertType']),
        mockFeature('myOtherApp', ['myAppAlertType', 'myOtherAppAlertType']),
      ]);
    });
    test('augments a list of types with all features when there is no authorization api', async () => {
      features.getKibanaFeatures.mockReturnValue([
        myAppFeature,
        myOtherAppFeature,
        myAppWithSubFeature,
        myFeatureWithoutAlerting,
      ]);
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
            "category": "test",
            "defaultActionGroupId": "default",
            "enabledInLicense": true,
            "hasAlertsMappings": false,
            "hasFieldsForAAD": false,
            "id": "myAppAlertType",
            "isExportable": true,
            "minimumLicenseRequired": "basic",
            "name": "myAppAlertType",
            "producer": "myApp",
            "recoveryActionGroup": Object {
              "id": "recovered",
              "name": "Recovered",
            },
            "validLegacyConsumers": Array [],
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
            "category": "test",
            "defaultActionGroupId": "default",
            "enabledInLicense": true,
            "hasAlertsMappings": false,
            "hasFieldsForAAD": false,
            "id": "myOtherAppAlertType",
            "isExportable": true,
            "minimumLicenseRequired": "basic",
            "name": "myOtherAppAlertType",
            "producer": "myOtherApp",
            "recoveryActionGroup": Object {
              "id": "recovered",
              "name": "Recovered",
            },
            "validLegacyConsumers": Array [],
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
            "category": "test",
            "defaultActionGroupId": "default",
            "enabledInLicense": true,
            "hasAlertsMappings": false,
            "hasFieldsForAAD": false,
            "id": "myOtherAppAlertType",
            "isExportable": true,
            "minimumLicenseRequired": "basic",
            "name": "myOtherAppAlertType",
            "producer": "myOtherApp",
            "recoveryActionGroup": Object {
              "id": "recovered",
              "name": "Recovered",
            },
            "validLegacyConsumers": Array [],
          },
          Object {
            "actionGroups": Array [],
            "actionVariables": undefined,
            "authorizedConsumers": Object {
              "myApp": Object {
                "all": true,
                "read": true,
              },
              "myOtherApp": Object {
                "all": true,
                "read": true,
              },
            },
            "category": "test",
            "defaultActionGroupId": "default",
            "enabledInLicense": true,
            "hasAlertsMappings": false,
            "hasFieldsForAAD": false,
            "id": "myAppAlertType",
            "isExportable": true,
            "minimumLicenseRequired": "basic",
            "name": "myAppAlertType",
            "producer": "myApp",
            "recoveryActionGroup": Object {
              "id": "recovered",
              "name": "Recovered",
            },
            "validLegacyConsumers": Array [],
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
              "myApp": Object {
                "all": true,
                "read": true,
              },
            },
            "category": "test",
            "defaultActionGroupId": "default",
            "enabledInLicense": true,
            "hasAlertsMappings": false,
            "hasFieldsForAAD": false,
            "id": "myAppAlertType",
            "isExportable": true,
            "minimumLicenseRequired": "basic",
            "name": "myAppAlertType",
            "producer": "myApp",
            "recoveryActionGroup": Object {
              "id": "recovered",
              "name": "Recovered",
            },
            "validLegacyConsumers": Array [],
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
              "myApp": Object {
                "all": true,
                "read": true,
              },
              "myOtherApp": Object {
                "all": false,
                "read": true,
              },
            },
            "category": "test",
            "defaultActionGroupId": "default",
            "enabledInLicense": true,
            "hasAlertsMappings": false,
            "hasFieldsForAAD": false,
            "id": "myOtherAppAlertType",
            "isExportable": true,
            "minimumLicenseRequired": "basic",
            "name": "myOtherAppAlertType",
            "producer": "myOtherApp",
            "recoveryActionGroup": Object {
              "id": "recovered",
              "name": "Recovered",
            },
            "validLegacyConsumers": Array [],
          },
          Object {
            "actionGroups": Array [],
            "actionVariables": undefined,
            "authorizedConsumers": Object {
              "myApp": Object {
                "all": false,
                "read": true,
              },
              "myOtherApp": Object {
                "all": false,
                "read": true,
              },
            },
            "category": "test",
            "defaultActionGroupId": "default",
            "enabledInLicense": true,
            "hasAlertsMappings": false,
            "hasFieldsForAAD": false,
            "id": "myAppAlertType",
            "isExportable": true,
            "minimumLicenseRequired": "basic",
            "name": "myAppAlertType",
            "producer": "myApp",
            "recoveryActionGroup": Object {
              "id": "recovered",
              "name": "Recovered",
            },
            "validLegacyConsumers": Array [],
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
              "myApp": Object {
                "all": true,
                "read": true,
              },
              "myOtherApp": Object {
                "all": true,
                "read": true,
              },
            },
            "category": "test",
            "defaultActionGroupId": "default",
            "enabledInLicense": true,
            "hasAlertsMappings": false,
            "hasFieldsForAAD": false,
            "id": "myOtherAppAlertType",
            "isExportable": true,
            "minimumLicenseRequired": "basic",
            "name": "myOtherAppAlertType",
            "producer": "myOtherApp",
            "recoveryActionGroup": Object {
              "id": "recovered",
              "name": "Recovered",
            },
            "validLegacyConsumers": Array [],
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
      category: 'test',
      producer: 'alerts',
      enabledInLicense: true,
      isExportable: true,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      validLegacyConsumers: [],
    };
    const myAppAlertType: RegistryRuleType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      recoveryActionGroup: RecoveredActionGroup,
      id: 'myAppAlertType',
      name: 'myAppAlertType',
      category: 'test',
      producer: 'myApp',
      enabledInLicense: true,
      isExportable: true,
      hasAlertsMappings: true,
      hasFieldsForAAD: true,
      validLegacyConsumers: [],
    };
    const mySecondAppAlertType: RegistryRuleType = {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      recoveryActionGroup: RecoveredActionGroup,
      id: 'mySecondAppAlertType',
      name: 'mySecondAppAlertType',
      category: 'test',
      producer: 'myApp',
      enabledInLicense: true,
      isExportable: true,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      validLegacyConsumers: [],
    };
    const setOfAlertTypes = new Set([myAppAlertType, myOtherAppAlertType, mySecondAppAlertType]);
    beforeEach(() => {
      features.getKibanaFeatures.mockReturnValue([mockFeature('myApp', ['myOtherAppAlertType'])]);
    });
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
              "category": "test",
              "defaultActionGroupId": "default",
              "enabledInLicense": true,
              "hasAlertsMappings": false,
              "hasFieldsForAAD": false,
              "id": "myOtherAppAlertType",
              "isExportable": true,
              "minimumLicenseRequired": "basic",
              "name": "myOtherAppAlertType",
              "producer": "alerts",
              "recoveryActionGroup": Object {
                "id": "recovered",
                "name": "Recovered",
              },
              "validLegacyConsumers": Array [],
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
              "category": "test",
              "defaultActionGroupId": "default",
              "enabledInLicense": true,
              "hasAlertsMappings": false,
              "hasFieldsForAAD": false,
              "id": "myOtherAppAlertType",
              "isExportable": true,
              "minimumLicenseRequired": "basic",
              "name": "myOtherAppAlertType",
              "producer": "alerts",
              "recoveryActionGroup": Object {
                "id": "recovered",
                "name": "Recovered",
              },
              "validLegacyConsumers": Array [],
            },
          },
          "hasAllRequested": false,
          "username": "some-user",
        }
      `);
    });
  });

  describe('8.11+', () => {
    let alertAuthorization: AlertingAuthorization;

    const setOfRuleTypes: RegistryRuleType[] = [
      {
        actionGroups: [],
        actionVariables: undefined,
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        id: '.esQuery',
        name: 'ES Query',
        category: 'management',
        producer: 'stackAlerts',
        enabledInLicense: true,
        hasAlertsMappings: false,
        hasFieldsForAAD: false,
        validLegacyConsumers: ['discover', 'alerts'],
      },
      {
        actionGroups: [],
        actionVariables: undefined,
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        id: '.threshold-rule-o11y',
        name: 'New threshold 011y',
        category: 'observability',
        producer: 'observability',
        enabledInLicense: true,
        hasAlertsMappings: false,
        hasFieldsForAAD: false,
        validLegacyConsumers: [],
      },
      {
        actionGroups: [],
        actionVariables: undefined,
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        id: '.infrastructure-threshold-o11y',
        name: 'Metrics o11y',
        category: 'observability',
        producer: 'infrastructure',
        enabledInLicense: true,
        hasAlertsMappings: false,
        hasFieldsForAAD: false,
        validLegacyConsumers: ['alerts'],
      },
      {
        actionGroups: [],
        actionVariables: undefined,
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        id: '.logs-threshold-o11y',
        name: 'Logs o11y',
        category: 'observability',
        producer: 'logs',
        enabledInLicense: true,
        hasAlertsMappings: false,
        hasFieldsForAAD: false,
        validLegacyConsumers: ['alerts'],
      },
    ];

    const onlyStackAlertsKibanaPrivileges = [
      {
        privilege: mockAuthorizationAction('.esQuery', 'stackAlerts', 'rule', 'create'),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction('.esQuery', 'stackAlerts', 'rule', 'find'),
        authorized: true,
      },
    ];
    const only011yKibanaPrivileges = [
      {
        privilege: mockAuthorizationAction(
          '.infrastructure-threshold-o11y',
          'infrastructure',
          'rule',
          'create'
        ),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction(
          '.infrastructure-threshold-o11y',
          'infrastructure',
          'rule',
          'find'
        ),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction(
          '.threshold-rule-o11y',
          'infrastructure',
          'rule',
          'create'
        ),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction(
          '.threshold-rule-o11y',
          'infrastructure',
          'rule',
          'find'
        ),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction('.logs-threshold-o11y', 'logs', 'rule', 'create'),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction('.logs-threshold-o11y', 'logs', 'rule', 'find'),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction('.threshold-rule-o11y', 'logs', 'rule', 'create'),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction('.threshold-rule-o11y', 'logs', 'rule', 'find'),
        authorized: true,
      },
    ];
    const onlyLogsAndStackAlertsKibanaPrivileges = [
      {
        privilege: mockAuthorizationAction('.esQuery', 'stackAlerts', 'rule', 'create'),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction('.esQuery', 'stackAlerts', 'rule', 'find'),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction('.logs-threshold-o11y', 'logs', 'rule', 'create'),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction('.logs-threshold-o11y', 'logs', 'rule', 'find'),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction('.threshold-rule-o11y', 'logs', 'rule', 'create'),
        authorized: true,
      },
      {
        privilege: mockAuthorizationAction('.threshold-rule-o11y', 'logs', 'rule', 'find'),
        authorized: true,
      },
    ];

    beforeEach(async () => {
      ruleTypeRegistry.list.mockReturnValue(new Set(setOfRuleTypes));
      ruleTypeRegistry.get.mockImplementation((id: string) => {
        if (setOfRuleTypes.some((rt) => rt.id === id)) {
          const ruleType = setOfRuleTypes.find((rt) => rt.id === id);
          return (ruleType ?? {}) as NormalizedRuleType<{}, {}, {}, {}, {}, '', '', {}>;
        }
        return {} as NormalizedRuleType<{}, {}, {}, {}, {}, '', '', {}>;
      });
    });

    describe('user only access to stack alerts + discover', () => {
      beforeEach(() => {
        const { authorization } = mockSecurity();
        const checkPrivileges: jest.MockedFunction<
          ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
        > = jest.fn();
        authorization.mode.useRbacForRequest.mockReturnValue(true);

        features.getKibanaFeatures.mockReset();
        features.getKibanaFeatures.mockReturnValue([
          mockFeature('stackAlerts', ['.esQuery']),
          mockFeature('discover', []),
        ]);
        checkPrivileges.mockReset();
        checkPrivileges.mockResolvedValue({
          username: 'onlyStack',
          hasAllRequested: true,
          privileges: {
            kibana: onlyStackAlertsKibanaPrivileges,
          },
        });
        authorization.checkPrivilegesDynamicallyWithRequest.mockReset();
        authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
        alertAuthorization = new AlertingAuthorization({
          request,
          authorization,
          ruleTypeRegistry,
          features,
          getSpace,
          getSpaceId,
        });
      });

      describe('ensureAuthorized', () => {
        test('should allow to create .esquery rule type with stackAlerts consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'stackAlerts',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).resolves.toEqual(undefined);

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should allow to create .esquery rule type with discover consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'discover',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).resolves.toEqual(undefined);

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should allow to create .esquery rule type with alerts consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'alerts',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).resolves.toEqual(undefined);

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should throw an error to create .esquery rule type with logs consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'logs',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Unauthorized by \\"logs\\" to create \\".esQuery\\" rule"`
          );

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should throw an error to create .esquery rule type with infrastructure consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'infrastructure',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Unauthorized by \\"infrastructure\\" to create \\".esQuery\\" rule"`
          );

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should throw an error to create .threshold-rule-o11y rule type with alerts consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.threshold-rule-o11y',
              consumer: 'alerts',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Unauthorized by \\"alerts\\" to create \\".threshold-rule-o11y\\" rule"`
          );

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should throw an error to create .logs-threshold-o11y rule type with alerts infrastructure', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.logs-threshold-o11y',
              consumer: 'alerts',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Unauthorized by \\"alerts\\" to create \\".logs-threshold-o11y\\" rule"`
          );

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
      });
      test('creates a filter based on the privileged types', async () => {
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
            `path.to.rule_type_id:.esQuery and consumer-field:(alerts or stackAlerts or discover)`
          )
        );
      });
    });

    describe('user only access to o11y', () => {
      beforeEach(() => {
        const { authorization } = mockSecurity();
        const checkPrivileges: jest.MockedFunction<
          ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
        > = jest.fn();
        authorization.mode.useRbacForRequest.mockReturnValue(true);

        features.getKibanaFeatures.mockReset();
        features.getKibanaFeatures.mockReturnValue([
          mockFeature('infrastructure', [
            '.infrastructure-threshold-o11y',
            '.threshold-rule-o11y',
            '.esQuery',
          ]),
          mockFeature('logs', ['.threshold-rule-o11y', '.esQuery', '.logs-threshold-o11y']),
        ]);
        checkPrivileges.mockReset();
        checkPrivileges.mockResolvedValue({
          username: 'onlyO11y',
          hasAllRequested: true,
          privileges: {
            kibana: only011yKibanaPrivileges,
          },
        });
        authorization.checkPrivilegesDynamicallyWithRequest.mockReset();
        authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
        alertAuthorization = new AlertingAuthorization({
          request,
          authorization,
          ruleTypeRegistry,
          features,
          getSpace,
          getSpaceId,
        });
      });

      describe('ensureAuthorized', () => {
        test('should throw an error to create .esquery rule type with stackAlerts consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'stackAlerts',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Unauthorized by \\"stackAlerts\\" to create \\".esQuery\\" rule"`
          );

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should throw an error to create .esquery rule type with discover consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'discover',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Unauthorized by \\"discover\\" to create \\".esQuery\\" rule"`
          );

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should throw an error to create .threshold-rule-o11y rule type with alerts consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.threshold-rule-o11y',
              consumer: 'alerts',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Unauthorized by \\"alerts\\" to create \\".threshold-rule-o11y\\" rule"`
          );

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should allow to create .esquery rule type with logs consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'logs',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).resolves.toEqual(undefined);

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should allow to create .esquery rule type with logs infrastructure', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'infrastructure',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).resolves.toEqual(undefined);

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should allow to create .logs-threshold-o11y rule type with alerts consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.logs-threshold-o11y',
              consumer: 'alerts',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).resolves.toEqual(undefined);

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should throw an error to create .threshold-rule-o11y rule type with logs consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.threshold-rule-o11y',
              consumer: 'logs',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).resolves.toEqual(undefined);

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
      });
      test('creates a filter based on the privileged types', async () => {
        expect(
          (
            await alertAuthorization.getFindAuthorizationFilter(
              AlertingAuthorizationEntity.Rule,
              {
                type: AlertingAuthorizationFilterType.KQL,
                fieldNames: {
                  ruleTypeId: 'path.to.rule_type_id',
                  consumer: 'consumer-field',
                },
              },
              new Set(['infrastructure', 'logs'])
            )
          ).filter
        ).toEqual(
          fromKueryExpression(
            `(path.to.rule_type_id:.infrastructure-threshold-o11y and consumer-field:(infrastructure or alerts)) or (path.to.rule_type_id:.threshold-rule-o11y and consumer-field:(infrastructure or logs)) or (path.to.rule_type_id:.logs-threshold-o11y and consumer-field:(logs or alerts))`
          )
        );
      });
    });

    describe('user only access to logs and stackAlerts', () => {
      beforeEach(() => {
        const { authorization } = mockSecurity();
        const checkPrivileges: jest.MockedFunction<
          ReturnType<typeof authorization.checkPrivilegesDynamicallyWithRequest>
        > = jest.fn();
        authorization.mode.useRbacForRequest.mockReturnValue(true);

        features.getKibanaFeatures.mockClear();
        features.getKibanaFeatures.mockReturnValue([
          mockFeature('stackAlerts', ['.esQuery']),
          mockFeature('logs', ['.logs-threshold-o11y', '.threshold-rule-o11y', '.esQuery']),
        ]);
        checkPrivileges.mockClear();
        checkPrivileges.mockResolvedValue({
          username: 'stackAndLogs',
          hasAllRequested: true,
          privileges: {
            kibana: onlyLogsAndStackAlertsKibanaPrivileges,
          },
        });
        authorization.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
        alertAuthorization = new AlertingAuthorization({
          request,
          authorization,
          ruleTypeRegistry,
          features,
          getSpace,
          getSpaceId,
        });
      });

      describe('ensureAuthorized', () => {
        test('should allow to create .esquery rule type with stackAlerts consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'stackAlerts',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).resolves.toEqual(undefined);

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should allow to create .esquery rule type with discover consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'discover',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).resolves.toEqual(undefined);

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should allow to create .esquery rule type with logs consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'logs',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).resolves.toEqual(undefined);

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should allow to create .logs-threshold-o11y rule type with alerts consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.logs-threshold-o11y',
              consumer: 'alerts',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).resolves.toEqual(undefined);

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should throw an error to create .threshold-rule-o11y rule type with logs consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.threshold-rule-o11y',
              consumer: 'logs',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).resolves.toEqual(undefined);

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should throw an error to create .esquery rule type with logs infrastructure', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'infrastructure',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Unauthorized by \\"infrastructure\\" to create \\".esQuery\\" rule"`
          );

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should throw an error to create .threshold-rule-o11y rule type with alerts consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.threshold-rule-o11y',
              consumer: 'alerts',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Unauthorized by \\"alerts\\" to create \\".threshold-rule-o11y\\" rule"`
          );

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
        test('should throw an error to create .esquery rule type with infrastructure consumer', async () => {
          await expect(
            alertAuthorization.ensureAuthorized({
              ruleTypeId: '.esQuery',
              consumer: 'infrastructure',
              operation: WriteOperations.Create,
              entity: AlertingAuthorizationEntity.Rule,
            })
          ).rejects.toThrowErrorMatchingInlineSnapshot(
            `"Unauthorized by \\"infrastructure\\" to create \\".esQuery\\" rule"`
          );

          expect(ruleTypeRegistry.get).toHaveBeenCalledTimes(1);
        });
      });
      test('creates a filter based on the privileged types', async () => {
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
            `(path.to.rule_type_id:.esQuery and consumer-field:(alerts or stackAlerts or logs or discover)) or (path.to.rule_type_id:.logs-threshold-o11y and consumer-field:(alerts or stackAlerts or logs or discover)) or (path.to.rule_type_id:.threshold-rule-o11y and consumer-field:(alerts or stackAlerts or logs or discover))`
          )
        );
      });
    });
  });
});
