/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { KueryNode, toKqlExpression } from '@kbn/es-query';
import { KibanaRequest } from '@kbn/core/server';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { KibanaFeature } from '@kbn/features-plugin/server';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { AlertingAuthorization } from './alerting_authorization';
import { AlertingAuthorizationFilterType } from './alerting_authorization_kuery';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { CheckPrivilegesResponse } from '@kbn/security-plugin-types-server';
import type { FeaturesPluginStart } from '@kbn/features-plugin/server';
import { WriteOperations, AlertingAuthorizationEntity, ReadOperations } from './types';
import { AlertingKibanaPrivilege } from '@kbn/features-plugin/common/alerting_kibana_privilege';

const mockAuthorizationAction = (
  ruleType: string,
  consumer: string,
  entity: string,
  operation: string
) => `${ruleType}/${consumer}/${entity}/${operation}`;

function mockFeatureWithConsumers(
  appName: string,
  alertingFeatures?: AlertingKibanaPrivilege,
  subFeature?: boolean
) {
  return new KibanaFeature({
    id: appName,
    name: appName,
    app: [],
    category: { id: 'foo', label: 'foo' },
    ...(alertingFeatures
      ? {
          alerting: alertingFeatures,
        }
      : {}),
    privileges: {
      all: {
        ...(alertingFeatures
          ? {
              alerting: {
                rule: {
                  all: alertingFeatures,
                },
                alert: {
                  all: alertingFeatures,
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
        ...(alertingFeatures
          ? {
              alerting: {
                rule: {
                  read: alertingFeatures,
                },
                alert: {
                  read: alertingFeatures,
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
    ...(subFeature
      ? {
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
                          all: alertingFeatures,
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
                          read: alertingFeatures,
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
        }
      : {}),
  });
}

type CheckPrivilegesResponseWithoutES = Omit<CheckPrivilegesResponse, 'privileges'> & {
  privileges: Omit<CheckPrivilegesResponse['privileges'], 'elasticsearch'>;
};

describe('AlertingAuthorization', () => {
  const getSpace = jest.fn();
  const getSpaceId = () => 'space1';
  const allRegisteredConsumers = new Set<string>();
  const ruleTypesConsumersMap = new Map<string, Set<string>>();

  const checkPrivileges = jest.fn<Promise<CheckPrivilegesResponseWithoutES>, []>(async () => ({
    username: 'elastic',
    hasAllRequested: true,
    privileges: { kibana: [] },
  }));

  const ruleTypeIds = ['rule-type-id-1', 'rule-type-id-2', 'rule-type-id-3', 'rule-type-id-4'];

  let request: KibanaRequest;
  let ruleTypeRegistry = ruleTypeRegistryMock.create();
  let securityStart: ReturnType<typeof securityMock.createStart>;
  let features: jest.Mocked<FeaturesPluginStart>;

  beforeEach(() => {
    jest.clearAllMocks();
    allRegisteredConsumers.clear();
    allRegisteredConsumers.clear();
    ruleTypesConsumersMap.clear();

    securityStart = securityMock.createStart();
    securityStart.authz.mode.useRbacForRequest.mockReturnValue(true);
    securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(checkPrivileges);
    request = httpServerMock.createKibanaRequest();
    getSpace.mockResolvedValue(undefined);

    features = featuresPluginMock.createStart();
    features.getKibanaFeatures.mockReturnValue([
      mockFeatureWithConsumers('feature-id-1', [
        {
          ruleTypeId: 'rule-type-id-1',
          consumers: ['alerts', 'consumer-a'],
        },
        { ruleTypeId: 'rule-type-id-2', consumers: ['alerts', 'consumer-b'] },
      ]),
      mockFeatureWithConsumers('feature-id-2', [
        {
          ruleTypeId: 'rule-type-id-1',
          consumers: ['alerts', 'consumer-b'],
        },
        {
          ruleTypeId: 'rule-type-id-3',
          consumers: ['alerts', 'consumer-c'],
        },
      ]),
      mockFeatureWithConsumers('feature-id-3', [
        {
          ruleTypeId: 'rule-type-id-4',
          consumers: ['consumer-d'],
        },
      ]),
    ]);

    const alertingGet = securityStart.authz.actions.alerting.get as jest.Mock;
    alertingGet.mockImplementation(mockAuthorizationAction);

    ruleTypeRegistry = ruleTypeRegistryMock.create();
    ruleTypeRegistry.getAllTypes.mockReturnValue(ruleTypeIds);
    ruleTypeRegistry.has.mockImplementation((ruleTypeId: string) =>
      ruleTypeIds.includes(ruleTypeId)
    );

    // @ts-expect-error: only the id is needed for the tests
    ruleTypeRegistry.get.mockImplementation((ruleTypeId: string) => ({ id: ruleTypeId }));
  });

  describe('create', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      securityStart = securityMock.createStart();
      features = featuresPluginMock.createStart();

      getSpace.mockReturnValue({ id: 'default', name: 'Default', disabledFeatures: [] });
      features.getKibanaFeatures.mockReturnValue([mockFeatureWithConsumers('my-feature-1')]);
    });

    it('creates an AlertingAuthorization object', async () => {
      expect.assertions(2);

      const authPromise = AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      await expect(authPromise).resolves.toBeDefined();
      await expect(authPromise).resolves.not.toThrow();
    });

    it('creates an AlertingAuthorization object without spaces', async () => {
      getSpace.mockReturnValue(undefined);
      expect.assertions(2);

      const authPromise = AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      await expect(authPromise).resolves.toBeDefined();
      await expect(authPromise).resolves.not.toThrow();
    });

    it('filters out disabled spaces and features without alerting', async () => {
      getSpace.mockReturnValue({
        id: 'default',
        name: 'Default',
        disabledFeatures: ['my-feature-1'],
      });

      features.getKibanaFeatures.mockReturnValue([
        mockFeatureWithConsumers('my-feature-1', [
          { ruleTypeId: 'rule-type-1', consumers: ['consumer-a', 'consumer-b'] },
        ]),
        mockFeatureWithConsumers('my-feature-2', [
          { ruleTypeId: 'rule-type-2', consumers: ['consumer-c', 'consumer-d'] },
        ]),
        mockFeatureWithConsumers('my-feature-3'),
        mockFeatureWithConsumers('my-feature-4', []),
      ]);

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      // @ts-expect-error: allRegisteredConsumers is a private method of the auth class
      expect(auth.allRegisteredConsumers).toMatchInlineSnapshot(`
        Set {
          "consumer-c",
          "consumer-d",
        }
      `);
      // @ts-expect-error: allRegisteredConsumers is a private method of the auth class
      expect(auth.ruleTypesConsumersMap).toMatchInlineSnapshot(`
        Map {
          "rule-type-2" => Set {
            "consumer-c",
            "consumer-d",
          },
        }
      `);
    });

    it('removes duplicated consumers', async () => {
      getSpace.mockReturnValue({
        id: 'default',
        name: 'Default',
        disabledFeatures: [],
      });

      features.getKibanaFeatures.mockReturnValue([
        mockFeatureWithConsumers('my-feature-1', [
          { ruleTypeId: 'rule-type-1', consumers: ['consumer-a', 'consumer-b', 'consumer-a'] },
          { ruleTypeId: 'rule-type-2', consumers: ['consumer-a', 'consumer-b', 'consumer-c'] },
        ]),
        mockFeatureWithConsumers('my-feature-2', [
          { ruleTypeId: 'rule-type-2', consumers: ['consumer-a', 'consumer-b', 'consumer-c'] },
        ]),
      ]);

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      // @ts-expect-error: allRegisteredConsumers is a private method of the auth class
      expect(auth.allRegisteredConsumers).toMatchInlineSnapshot(`
        Set {
          "consumer-a",
          "consumer-b",
          "consumer-c",
        }
      `);
    });

    it('removes duplicated ruleTypes and consumers', async () => {
      getSpace.mockReturnValue({
        id: 'default',
        name: 'Default',
        disabledFeatures: [],
      });

      features.getKibanaFeatures.mockReturnValue([
        mockFeatureWithConsumers('my-feature-1', [
          { ruleTypeId: 'rule-type-1', consumers: ['consumer-a', 'consumer-b', 'consumer-a'] },
          { ruleTypeId: 'rule-type-2', consumers: ['consumer-a', 'consumer-b', 'consumer-c'] },
        ]),
        mockFeatureWithConsumers('my-feature-2', [
          { ruleTypeId: 'rule-type-2', consumers: ['consumer-a', 'consumer-b', 'consumer-e'] },
          { ruleTypeId: 'rule-type-1', consumers: ['consumer-a', 'consumer-b', 'consumer-d'] },
        ]),
      ]);

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      // @ts-expect-error: ruleTypesConsumersMap is a private method of the auth class
      expect(auth.ruleTypesConsumersMap).toMatchInlineSnapshot(`
        Map {
          "rule-type-1" => Set {
            "consumer-a",
            "consumer-b",
            "consumer-d",
          },
          "rule-type-2" => Set {
            "consumer-a",
            "consumer-b",
            "consumer-c",
            "consumer-e",
          },
        }
      `);
    });

    it('throws an error when a generic error occurs', async () => {
      expect.assertions(1);

      getSpace.mockRejectedValue(new Error('Error'));

      const authPromise = AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      await expect(authPromise).rejects.toThrow();
    });

    it.each([403, 404])(
      `construct the AlertingAuthorization with empty features if the error is boom and %s`,
      async (errorStatusCode: number) => {
        getSpace.mockRejectedValue(
          new Boom.Boom('Server error', {
            statusCode: errorStatusCode,
            message: 'my error message',
          })
        );

        const auth = await AlertingAuthorization.create({
          request,
          ruleTypeRegistry,
          getSpaceId,
          features,
          getSpace,
          authorization: securityStart.authz,
        });

        // @ts-expect-error: allRegisteredConsumers is a private method of the auth class
        expect(auth.ruleTypesConsumersMap).toMatchInlineSnapshot(`Map {}`);
        // @ts-expect-error: allRegisteredConsumers is a private method of the auth class
        expect(auth.allRegisteredConsumers).toMatchInlineSnapshot(`Set {}`);
      }
    );

    it('throws an error if the error is boom but not 403', async () => {
      expect.assertions(1);

      getSpace.mockRejectedValue(
        new Boom.Boom('Server error', { statusCode: 400, message: 'my error message' })
      );

      const authPromise = AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      await expect(authPromise).rejects.toThrow();
    });
  });

  describe('ensureAuthorized', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      allRegisteredConsumers.clear();
      allRegisteredConsumers.add('myApp');
    });

    it('is a no-op when there is no authorization api', async () => {
      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        getSpaceId,
        allRegisteredConsumers,
        ruleTypesConsumersMap,
      });

      await alertAuthorization.ensureAuthorized({
        ruleTypeId: 'myType',
        consumer: 'myApp',
        operation: WriteOperations.Create,
        entity: AlertingAuthorizationEntity.Rule,
      });

      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    it('is a no-op when the security license is disabled', async () => {
      securityStart.authz.mode.useRbacForRequest.mockReturnValue(false);

      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        authorization: securityStart.authz,
        getSpaceId,
        allRegisteredConsumers,
        ruleTypesConsumersMap,
      });

      await alertAuthorization.ensureAuthorized({
        ruleTypeId: 'myType',
        consumer: 'myApp',
        operation: WriteOperations.Create,
        entity: AlertingAuthorizationEntity.Rule,
      });

      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    it('authorized correctly', async () => {
      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        authorization: securityStart.authz,
        getSpaceId,
        allRegisteredConsumers,
        ruleTypesConsumersMap,
      });

      await alertAuthorization.ensureAuthorized({
        ruleTypeId: 'myType',
        consumer: 'myApp',
        operation: WriteOperations.Create,
        entity: AlertingAuthorizationEntity.Rule,
      });

      expect(checkPrivileges).toBeCalledTimes(1);
      expect(checkPrivileges.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "kibana": Array [
              "myType/myApp/rule/create",
            ],
          },
        ]
      `);
    });

    it('throws if user lacks the required rule privileges for the consumer', async () => {
      securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
        jest.fn(async () => ({ hasAllRequested: false }))
      );

      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        authorization: securityStart.authz,
        getSpaceId,
        allRegisteredConsumers,
        ruleTypesConsumersMap,
      });

      await expect(
        alertAuthorization.ensureAuthorized({
          ruleTypeId: 'myType',
          consumer: 'myApp',
          operation: WriteOperations.Create,
          entity: AlertingAuthorizationEntity.Rule,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized by \\"myApp\\" to create \\"myType\\" rule"`
      );
    });

    it('throws if user lacks the required alert privileges for the consumer', async () => {
      securityStart.authz.checkPrivilegesDynamicallyWithRequest.mockReturnValue(
        jest.fn(async () => ({ hasAllRequested: false }))
      );

      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        authorization: securityStart.authz,
        getSpaceId,
        allRegisteredConsumers,
        ruleTypesConsumersMap,
      });

      await expect(
        alertAuthorization.ensureAuthorized({
          ruleTypeId: 'myType',
          consumer: 'myApp',
          operation: WriteOperations.Update,
          entity: AlertingAuthorizationEntity.Alert,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized by \\"myApp\\" to update \\"myType\\" alert"`
      );
    });

    it('throws if the user has access but the consumer is not registered', async () => {
      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        authorization: securityStart.authz,
        getSpaceId,
        allRegisteredConsumers,
        ruleTypesConsumersMap,
      });

      await expect(
        alertAuthorization.ensureAuthorized({
          ruleTypeId: 'myType',
          consumer: 'not-exist',
          operation: WriteOperations.Create,
          entity: AlertingAuthorizationEntity.Rule,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized by \\"not-exist\\" to create \\"myType\\" rule"`
      );
    });

    it('throws when there is no authorization api but the consumer is not registered', async () => {
      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        getSpaceId,
        allRegisteredConsumers,
        ruleTypesConsumersMap,
      });

      await expect(
        alertAuthorization.ensureAuthorized({
          ruleTypeId: 'myType',
          consumer: 'not-exist',
          operation: WriteOperations.Create,
          entity: AlertingAuthorizationEntity.Rule,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized by \\"not-exist\\" to create \\"myType\\" rule"`
      );
    });

    it('throws when the security license is disabled but the consumer is not registered', async () => {
      securityStart.authz.mode.useRbacForRequest.mockReturnValue(false);

      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        getSpaceId,
        allRegisteredConsumers,
        ruleTypesConsumersMap,
      });

      await expect(
        alertAuthorization.ensureAuthorized({
          ruleTypeId: 'myType',
          consumer: 'not-exist',
          operation: WriteOperations.Create,
          entity: AlertingAuthorizationEntity.Rule,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized by \\"not-exist\\" to create \\"myType\\" rule"`
      );
    });

    it('throws an error when the consumer does not exist because it was from a disabled plugin', async () => {
      features.getKibanaFeatures.mockReturnValue([
        mockFeatureWithConsumers('my-feature-1', [
          { ruleTypeId: 'rule-type-1', consumers: ['disabled-feature-consumer'] },
        ]),
        mockFeatureWithConsumers('my-feature-2', [
          { ruleTypeId: 'rule-type-2', consumers: ['enabled-feature-consumer'] },
        ]),
      ]);

      getSpace.mockReturnValue({
        id: 'default',
        name: 'Default',
        disabledFeatures: ['my-feature-1'],
      });

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      await expect(
        auth.ensureAuthorized({
          ruleTypeId: 'rule-type-1',
          consumer: 'disabled-feature-consumer',
          operation: WriteOperations.Create,
          entity: AlertingAuthorizationEntity.Rule,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unauthorized by \\"disabled-feature-consumer\\" to create \\"rule-type-1\\" rule"`
      );
    });

    it('checks additional privileges correctly', async () => {
      const alertAuthorization = new AlertingAuthorization({
        request,
        ruleTypeRegistry,
        authorization: securityStart.authz,
        getSpaceId,
        allRegisteredConsumers,
        ruleTypesConsumersMap,
      });

      await alertAuthorization.ensureAuthorized({
        ruleTypeId: 'myType',
        consumer: 'myApp',
        operation: WriteOperations.Create,
        entity: AlertingAuthorizationEntity.Rule,
        additionalPrivileges: ['test/create'],
      });

      expect(checkPrivileges).toBeCalledTimes(1);
      expect(checkPrivileges.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "kibana": Array [
              "myType/myApp/rule/create",
              "test/create",
            ],
          },
        ]
      `);
    });
  });

  describe('getFindAuthorizationFilter', () => {
    it('creates a filter based on the privileged types', async () => {
      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'alerts', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-b', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-2', 'alerts', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-2', 'consumer-b', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-3', 'consumer-c', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-3', 'alerts', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-3', 'consumer-d', 'rule', 'find'),
              authorized: false,
            },
          ],
        },
      });

      const filter = (
        await auth.getFindAuthorizationFilter({
          authorizationEntity: AlertingAuthorizationEntity.Rule,
          filterOpts: {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'path.to.rule_type_id',
              consumer: 'consumer-field',
            },
          },
        })
      ).filter;

      expect(checkPrivileges).toBeCalledTimes(1);
      expect(checkPrivileges.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "kibana": Array [
              "rule-type-id-1/alerts/rule/find",
              "rule-type-id-1/consumer-a/rule/find",
              "rule-type-id-1/consumer-b/rule/find",
              "rule-type-id-2/alerts/rule/find",
              "rule-type-id-2/consumer-b/rule/find",
              "rule-type-id-3/alerts/rule/find",
              "rule-type-id-3/consumer-c/rule/find",
              "rule-type-id-4/consumer-d/rule/find",
            ],
          },
        ]
      `);

      expect(toKqlExpression(filter as KueryNode)).toMatchInlineSnapshot(
        `"((path.to.rule_type_id: rule-type-id-1 AND (consumer-field: alerts OR consumer-field: consumer-a OR consumer-field: consumer-b)) OR (path.to.rule_type_id: rule-type-id-2 AND (consumer-field: alerts OR consumer-field: consumer-b)) OR (path.to.rule_type_id: rule-type-id-3 AND (consumer-field: consumer-c OR consumer-field: alerts)))"`
      );
    });

    it('does not throw if the rule type is authorized', async () => {
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'find'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-2', 'consumer-b', 'rule', 'find'),
              authorized: true,
            },
          ],
        },
      });

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      const { ensureRuleTypeIsAuthorized } = await auth.getFindAuthorizationFilter({
        authorizationEntity: AlertingAuthorizationEntity.Rule,
        filterOpts: {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
      });

      expect(() =>
        ensureRuleTypeIsAuthorized('rule-type-id-1', 'consumer-a', 'rule')
      ).not.toThrow();

      expect(() =>
        ensureRuleTypeIsAuthorized('rule-type-id-2', 'consumer-b', 'rule')
      ).not.toThrow();
    });
  });

  describe('getAuthorizationFilter', () => {
    describe('filter', () => {
      it('gets the filter correctly with no security and no spaceIds in the fields names', async () => {
        const auth = await AlertingAuthorization.create({
          request,
          ruleTypeRegistry,
          getSpaceId,
          features,
          getSpace,
        });

        const { filter } = await auth.getAuthorizationFilter({
          authorizationEntity: AlertingAuthorizationEntity.Rule,
          filterOpts: {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'ruleId',
              consumer: 'consumer',
            },
          },
          operation: ReadOperations.Get,
        });

        expect(filter).toEqual(undefined);
      });

      // This is a specific use case currently for alerts as data
      // Space ids are stored in the alerts documents and even if security is disabled
      // still need to consider the users space privileges
      it('gets the filter correctly with no security and spaceIds in the fields names', async () => {
        const auth = await AlertingAuthorization.create({
          request,
          ruleTypeRegistry,
          getSpaceId,
          features,
          getSpace,
        });

        const { filter } = await auth.getAuthorizationFilter({
          authorizationEntity: AlertingAuthorizationEntity.Rule,
          filterOpts: {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'ruleId',
              consumer: 'consumer',
              spaceIds: 'path.to.space.id',
            },
          },
          operation: ReadOperations.Get,
        });

        expect(toKqlExpression(filter as KueryNode)).toMatchInlineSnapshot(
          `"path.to.space.id: space1"`
        );
      });

      it('gets the filter correctly with security disabled', async () => {
        securityStart.authz.mode.useRbacForRequest.mockReturnValue(false);

        const auth = await AlertingAuthorization.create({
          request,
          ruleTypeRegistry,
          getSpaceId,
          features,
          getSpace,
          authorization: securityStart.authz,
        });

        const { filter } = await auth.getAuthorizationFilter({
          authorizationEntity: AlertingAuthorizationEntity.Rule,
          filterOpts: {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'ruleId',
              consumer: 'consumer',
            },
          },
          operation: ReadOperations.Get,
        });

        expect(filter).toEqual(undefined);
      });

      it('gets the filter correctly for all rule types and consumers', async () => {
        checkPrivileges.mockResolvedValueOnce({
          username: 'some-user',
          hasAllRequested: true,
          privileges: {
            kibana: [
              {
                privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
                authorized: true,
              },
              {
                privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-b', 'rule', 'get'),
                authorized: true,
              },
              {
                privilege: mockAuthorizationAction('rule-type-id-2', 'consumer-b', 'rule', 'get'),
                authorized: true,
              },
              {
                privilege: mockAuthorizationAction('rule-type-id-3', 'consumer-c', 'rule', 'get'),
                authorized: true,
              },
              {
                privilege: mockAuthorizationAction('rule-type-id-4', 'consumer-d', 'rule', 'get'),
                authorized: true,
              },
            ],
          },
        });

        const auth = await AlertingAuthorization.create({
          request,
          ruleTypeRegistry,
          getSpaceId,
          features,
          getSpace,
          authorization: securityStart.authz,
        });

        const { filter } = await auth.getAuthorizationFilter({
          authorizationEntity: AlertingAuthorizationEntity.Rule,
          filterOpts: {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'ruleId',
              consumer: 'consumer',
            },
          },
          operation: ReadOperations.Get,
        });

        expect(toKqlExpression(filter as KueryNode)).toMatchInlineSnapshot(
          `"((ruleId: rule-type-id-1 AND (consumer: consumer-a OR consumer: consumer-b)) OR (ruleId: rule-type-id-2 AND consumer: consumer-b) OR (ruleId: rule-type-id-3 AND consumer: consumer-c) OR (ruleId: rule-type-id-4 AND consumer: consumer-d))"`
        );
      });

      it('throws when the user is not authorized for any rule type', async () => {
        checkPrivileges.mockResolvedValueOnce({
          username: 'some-user',
          hasAllRequested: true,
          privileges: {
            kibana: [],
          },
        });

        const auth = await AlertingAuthorization.create({
          request,
          ruleTypeRegistry,
          getSpaceId,
          features,
          getSpace,
          authorization: securityStart.authz,
        });

        await expect(
          auth.getAuthorizationFilter({
            authorizationEntity: AlertingAuthorizationEntity.Rule,
            filterOpts: {
              type: AlertingAuthorizationFilterType.KQL,
              fieldNames: {
                ruleTypeId: 'ruleId',
                consumer: 'consumer',
              },
            },
            operation: ReadOperations.Get,
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Unauthorized to get rules for any rule types"`
        );
      });
    });

    describe('ensureRuleTypeIsAuthorized', () => {
      it('does not throw if the rule type is authorized', async () => {
        checkPrivileges.mockResolvedValueOnce({
          username: 'some-user',
          hasAllRequested: true,
          privileges: {
            kibana: [
              {
                privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
                authorized: true,
              },
              {
                privilege: mockAuthorizationAction('rule-type-id-2', 'consumer-b', 'rule', 'get'),
                authorized: true,
              },
            ],
          },
        });

        const auth = await AlertingAuthorization.create({
          request,
          ruleTypeRegistry,
          getSpaceId,
          features,
          getSpace,
          authorization: securityStart.authz,
        });

        const { ensureRuleTypeIsAuthorized } = await auth.getAuthorizationFilter({
          authorizationEntity: AlertingAuthorizationEntity.Rule,
          filterOpts: {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'ruleId',
              consumer: 'consumer',
            },
          },
          operation: ReadOperations.Get,
        });

        expect(() =>
          ensureRuleTypeIsAuthorized('rule-type-id-1', 'consumer-a', 'rule')
        ).not.toThrow();

        expect(() =>
          ensureRuleTypeIsAuthorized('rule-type-id-2', 'consumer-b', 'rule')
        ).not.toThrow();
      });

      it('throws if the rule type is not authorized', async () => {
        checkPrivileges.mockResolvedValueOnce({
          username: 'some-user',
          hasAllRequested: true,
          privileges: {
            kibana: [
              {
                privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
                authorized: true,
              },
            ],
          },
        });

        const auth = await AlertingAuthorization.create({
          request,
          ruleTypeRegistry,
          getSpaceId,
          features,
          getSpace,
          authorization: securityStart.authz,
        });

        const { ensureRuleTypeIsAuthorized } = await auth.getAuthorizationFilter({
          authorizationEntity: AlertingAuthorizationEntity.Rule,
          filterOpts: {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'ruleId',
              consumer: 'consumer',
            },
          },
          operation: ReadOperations.Get,
        });

        expect(() =>
          ensureRuleTypeIsAuthorized('rule-type-id-2', 'consumer-a', 'rule')
        ).toThrowErrorMatchingInlineSnapshot(
          `"Unauthorized by \\"consumer-a\\" to get \\"rule-type-id-2\\" rule"`
        );
      });

      it('throws if the rule type is not authorized for the entity', async () => {
        checkPrivileges.mockResolvedValueOnce({
          username: 'some-user',
          hasAllRequested: true,
          privileges: {
            kibana: [
              {
                privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
                authorized: true,
              },
            ],
          },
        });

        const auth = await AlertingAuthorization.create({
          request,
          ruleTypeRegistry,
          getSpaceId,
          features,
          getSpace,
          authorization: securityStart.authz,
        });

        const { ensureRuleTypeIsAuthorized } = await auth.getAuthorizationFilter({
          authorizationEntity: AlertingAuthorizationEntity.Rule,
          filterOpts: {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'ruleId',
              consumer: 'consumer',
            },
          },
          operation: ReadOperations.Get,
        });

        expect(() =>
          ensureRuleTypeIsAuthorized('rule-type-id-1', 'consumer-a', 'alert')
        ).toThrowErrorMatchingInlineSnapshot(
          `"Unauthorized by \\"consumer-a\\" to get \\"rule-type-id-1\\" alert"`
        );
      });

      it('throws if the rule type is not authorized for the consumer', async () => {
        checkPrivileges.mockResolvedValueOnce({
          username: 'some-user',
          hasAllRequested: true,
          privileges: {
            kibana: [
              {
                privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
                authorized: true,
              },
            ],
          },
        });

        const auth = await AlertingAuthorization.create({
          request,
          ruleTypeRegistry,
          getSpaceId,
          features,
          getSpace,
          authorization: securityStart.authz,
        });

        const { ensureRuleTypeIsAuthorized } = await auth.getAuthorizationFilter({
          authorizationEntity: AlertingAuthorizationEntity.Rule,
          filterOpts: {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'ruleId',
              consumer: 'consumer',
            },
          },
          operation: ReadOperations.Get,
        });

        expect(() =>
          ensureRuleTypeIsAuthorized('rule-type-id-1', 'consumer-b', 'rule')
        ).toThrowErrorMatchingInlineSnapshot(
          `"Unauthorized by \\"consumer-b\\" to get \\"rule-type-id-1\\" rule"`
        );
      });
    });
  });

  describe('getAuthorizedRuleTypes', () => {
    it('calls checkPrivileges correctly', async () => {
      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      await auth.getAuthorizedRuleTypes({
        ruleTypeIds: ['rule-type-id-1'],
        operations: [WriteOperations.Create],
        authorizationEntity: AlertingAuthorizationEntity.Rule,
      });

      expect(checkPrivileges).toBeCalledTimes(1);
      expect(checkPrivileges.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "kibana": Array [
              "rule-type-id-1/alerts/rule/create",
              "rule-type-id-1/consumer-a/rule/create",
              "rule-type-id-1/consumer-b/rule/create",
            ],
          },
        ]
      `);
    });

    it('returns the authorized rules correctly', async () => {
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-2', 'consumer-b', 'rule', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-3', 'consumer-c', 'rule', 'create'),
              authorized: true,
            },
          ],
        },
      });

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      expect(
        await auth.getAuthorizedRuleTypes({
          ruleTypeIds: ['rule-type-id-1'],
          operations: [WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Map {
          "rule-type-id-1" => Object {
            "authorizedConsumers": Object {
              "consumer-a": Object {
                "all": true,
                "read": true,
              },
            },
          },
        }
      `);
    });
  });

  describe('getAllAuthorizedRuleTypes', () => {
    it('get authorized rule types with authorized consumers', async () => {
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-2', 'consumer-b', 'rule', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-3', 'consumer-c', 'rule', 'create'),
              authorized: false,
            },
          ],
        },
      });

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      expect(
        await auth.getAllAuthorizedRuleTypes({
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {
            "rule-type-id-1" => Object {
              "authorizedConsumers": Object {
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
            "rule-type-id-2" => Object {
              "authorizedConsumers": Object {
                "consumer-b": Object {
                  "all": false,
                  "read": true,
                },
              },
            },
          },
          "hasAllRequested": true,
          "username": "some-user",
        }
      `);
    });

    it('calls checkPrivileges with the correct actions', async () => {
      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      await auth.getAllAuthorizedRuleTypes({
        operations: [ReadOperations.Get, WriteOperations.Create],
        authorizationEntity: AlertingAuthorizationEntity.Rule,
      });

      expect(checkPrivileges).toBeCalledTimes(1);
      expect(checkPrivileges.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "kibana": Array [
              "rule-type-id-1/alerts/rule/get",
              "rule-type-id-1/alerts/rule/create",
              "rule-type-id-1/consumer-a/rule/get",
              "rule-type-id-1/consumer-a/rule/create",
              "rule-type-id-1/consumer-b/rule/get",
              "rule-type-id-1/consumer-b/rule/create",
              "rule-type-id-2/alerts/rule/get",
              "rule-type-id-2/alerts/rule/create",
              "rule-type-id-2/consumer-b/rule/get",
              "rule-type-id-2/consumer-b/rule/create",
              "rule-type-id-3/alerts/rule/get",
              "rule-type-id-3/alerts/rule/create",
              "rule-type-id-3/consumer-c/rule/get",
              "rule-type-id-3/consumer-c/rule/create",
              "rule-type-id-4/consumer-d/rule/get",
              "rule-type-id-4/consumer-d/rule/create",
            ],
          },
        ]
      `);
    });
  });

  describe('_getAuthorizedRuleTypesWithAuthorizedConsumers', () => {
    it('returns all rule types with all consumers as authorized with no authorization', async () => {
      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
      });

      expect(
        // @ts-expect-error: need to test the private method
        await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
          ruleTypeIds,
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {
            "rule-type-id-1" => Object {
              "authorizedConsumers": Object {
                "alerts": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-c": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-d": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
            "rule-type-id-2" => Object {
              "authorizedConsumers": Object {
                "alerts": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-c": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-d": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
            "rule-type-id-3" => Object {
              "authorizedConsumers": Object {
                "alerts": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-c": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-d": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
            "rule-type-id-4" => Object {
              "authorizedConsumers": Object {
                "alerts": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-c": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-d": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
          },
          "hasAllRequested": true,
        }
      `);
    });

    it('filters out rule types with no authorization', async () => {
      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
      });

      expect(
        // @ts-expect-error: need to test the private method
        await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
          ruleTypeIds: [ruleTypeIds[0], ruleTypeIds[1]],
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {
            "rule-type-id-1" => Object {
              "authorizedConsumers": Object {
                "alerts": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-c": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-d": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
            "rule-type-id-2" => Object {
              "authorizedConsumers": Object {
                "alerts": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-c": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-d": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
          },
          "hasAllRequested": true,
        }
      `);
    });

    it('returns all rule types with all consumers as authorized with disabled authorization', async () => {
      securityStart.authz.mode.useRbacForRequest.mockReturnValue(false);

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      expect(
        // @ts-expect-error: need to test the private method
        await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
          ruleTypeIds,
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {
            "rule-type-id-1" => Object {
              "authorizedConsumers": Object {
                "alerts": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-c": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-d": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
            "rule-type-id-2" => Object {
              "authorizedConsumers": Object {
                "alerts": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-c": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-d": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
            "rule-type-id-3" => Object {
              "authorizedConsumers": Object {
                "alerts": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-c": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-d": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
            "rule-type-id-4" => Object {
              "authorizedConsumers": Object {
                "alerts": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-c": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-d": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
          },
          "hasAllRequested": true,
        }
      `);
    });

    it('filters out rule types with disabled authorization', async () => {
      securityStart.authz.mode.useRbacForRequest.mockReturnValue(false);

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      expect(
        // @ts-expect-error: need to test the private method
        await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
          ruleTypeIds: [ruleTypeIds[0], ruleTypeIds[1]],
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {
            "rule-type-id-1" => Object {
              "authorizedConsumers": Object {
                "alerts": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-c": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-d": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
            "rule-type-id-2" => Object {
              "authorizedConsumers": Object {
                "alerts": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-c": Object {
                  "all": true,
                  "read": true,
                },
                "consumer-d": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
          },
          "hasAllRequested": true,
        }
      `);
    });

    it('get authorized rule types with authorized consumers with read access only', async () => {
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
              authorized: true,
            },
          ],
        },
      });

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      expect(
        // @ts-expect-error: need to test the private method
        await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
          ruleTypeIds,
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {
            "rule-type-id-1" => Object {
              "authorizedConsumers": Object {
                "consumer-a": Object {
                  "all": false,
                  "read": true,
                },
              },
            },
          },
          "hasAllRequested": true,
          "username": "some-user",
        }
      `);
    });

    it('get authorized rule types with authorized consumers with full access', async () => {
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'create'),
              authorized: true,
            },
          ],
        },
      });

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      expect(
        // @ts-expect-error: need to test the private method
        await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
          ruleTypeIds,
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {
            "rule-type-id-1" => Object {
              "authorizedConsumers": Object {
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
          },
          "hasAllRequested": true,
          "username": "some-user",
        }
      `);
    });

    it('filters out not requested rule types', async () => {
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-b', 'rule', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-3', 'consumer-c', 'rule', 'create'),
              authorized: true,
            },
          ],
        },
      });

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      expect(
        // @ts-expect-error: need to test the private method
        await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
          ruleTypeIds: [ruleTypeIds[0], ruleTypeIds[1]],
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {
            "rule-type-id-1" => Object {
              "authorizedConsumers": Object {
                "consumer-a": Object {
                  "all": false,
                  "read": true,
                },
                "consumer-b": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
          },
          "hasAllRequested": true,
          "username": "some-user",
        }
      `);
    });

    it('returns an empty map with no requested rule types', async () => {
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'create'),
              authorized: true,
            },
          ],
        },
      });

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      expect(
        // @ts-expect-error: need to test the private method
        await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
          ruleTypeIds: [],
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {},
          "hasAllRequested": true,
          "username": "some-user",
        }
      `);
    });

    it('get authorized rule types with authorized consumers when some rule types are not authorized', async () => {
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-2', 'consumer-b', 'rule', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-3', 'consumer-c', 'rule', 'get'),
              authorized: true,
            },
          ],
        },
      });

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      expect(
        // @ts-expect-error: need to test the private method
        await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
          ruleTypeIds,
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {
            "rule-type-id-1" => Object {
              "authorizedConsumers": Object {
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
            "rule-type-id-3" => Object {
              "authorizedConsumers": Object {
                "consumer-c": Object {
                  "all": false,
                  "read": true,
                },
              },
            },
          },
          "hasAllRequested": true,
          "username": "some-user",
        }
      `);
    });

    it('get authorized rule types with authorized consumers when consumers are not valid for a rule type', async () => {
      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'create'),
              authorized: true,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-2', 'consumer-b', 'rule', 'create'),
              authorized: false,
            },
            {
              privilege: mockAuthorizationAction('rule-type-id-3', 'consumer-d', 'rule', 'get'),
              authorized: true,
            },
          ],
        },
      });

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      expect(
        // @ts-expect-error: need to test the private method
        await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
          ruleTypeIds,
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {
            "rule-type-id-1" => Object {
              "authorizedConsumers": Object {
                "consumer-a": Object {
                  "all": true,
                  "read": true,
                },
              },
            },
          },
          "hasAllRequested": true,
          "username": "some-user",
        }
      `);
    });

    it('filters out rule types that are not in the rule type registry but registered in the feature', async () => {
      ruleTypeRegistry.has.mockImplementation((ruleTypeId: string) => false);

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('rule-type-id-1', 'consumer-a', 'rule', 'get'),
              authorized: true,
            },
          ],
        },
      });

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      expect(
        // @ts-expect-error: need to test the private method
        await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
          ruleTypeIds: ['rule-type-id-1'],
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {},
          "hasAllRequested": true,
          "username": "some-user",
        }
      `);
    });

    it('filters out rule types that are registered in the rule type registry but not in the feature', async () => {
      ruleTypeRegistry.has.mockImplementation((ruleTypeId: string) => true);

      checkPrivileges.mockResolvedValueOnce({
        username: 'some-user',
        hasAllRequested: true,
        privileges: {
          kibana: [
            {
              privilege: mockAuthorizationAction('not-exist', 'consumer-a', 'rule', 'get'),
              authorized: true,
            },
          ],
        },
      });

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      expect(
        // @ts-expect-error: need to test the private method
        await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
          ruleTypeIds: ['not-exist'],
          operations: [ReadOperations.Get, WriteOperations.Create],
          authorizationEntity: AlertingAuthorizationEntity.Rule,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "authorizedRuleTypes": Map {},
          "hasAllRequested": true,
          "username": "some-user",
        }
      `);
    });

    it('call checkPrivileges with the correct actions', async () => {
      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      // @ts-expect-error: need to test the private method
      await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
        ruleTypeIds: [...ruleTypeIds, 'rule-type-not-exist'],
        operations: [ReadOperations.Get, WriteOperations.Create],
        authorizationEntity: AlertingAuthorizationEntity.Rule,
      });

      expect(checkPrivileges).toBeCalledTimes(1);
      expect(checkPrivileges.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "kibana": Array [
              "rule-type-id-1/alerts/rule/get",
              "rule-type-id-1/alerts/rule/create",
              "rule-type-id-1/consumer-a/rule/get",
              "rule-type-id-1/consumer-a/rule/create",
              "rule-type-id-1/consumer-b/rule/get",
              "rule-type-id-1/consumer-b/rule/create",
              "rule-type-id-2/alerts/rule/get",
              "rule-type-id-2/alerts/rule/create",
              "rule-type-id-2/consumer-b/rule/get",
              "rule-type-id-2/consumer-b/rule/create",
              "rule-type-id-3/alerts/rule/get",
              "rule-type-id-3/alerts/rule/create",
              "rule-type-id-3/consumer-c/rule/get",
              "rule-type-id-3/consumer-c/rule/create",
              "rule-type-id-4/consumer-d/rule/get",
              "rule-type-id-4/consumer-d/rule/create",
            ],
          },
        ]
      `);
    });

    it('call checkPrivileges with the correct actions when the rule type does not exist in the registry', async () => {
      ruleTypeRegistry.has.mockImplementation((ruleTypeId: string) => false);

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      // @ts-expect-error: need to test the private method
      await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
        ruleTypeIds: ['rule-type-id-1'],
        operations: [ReadOperations.Get, WriteOperations.Create],
        authorizationEntity: AlertingAuthorizationEntity.Rule,
      });

      expect(checkPrivileges).toBeCalledTimes(1);
      expect(checkPrivileges.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "kibana": Array [],
          },
        ]
      `);
    });

    it('call checkPrivileges with the correct actions when the rule type does not exist in the feature', async () => {
      ruleTypeRegistry.has.mockImplementation((ruleTypeId: string) => true);

      const auth = await AlertingAuthorization.create({
        request,
        ruleTypeRegistry,
        getSpaceId,
        features,
        getSpace,
        authorization: securityStart.authz,
      });

      // @ts-expect-error: need to test the private method
      await auth._getAuthorizedRuleTypesWithAuthorizedConsumers({
        ruleTypeIds: ['not-exist'],
        operations: [ReadOperations.Get, WriteOperations.Create],
        authorizationEntity: AlertingAuthorizationEntity.Rule,
      });

      expect(checkPrivileges).toBeCalledTimes(1);
      expect(checkPrivileges.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "kibana": Array [],
          },
        ]
      `);
    });
  });
});
