/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { loggerMock } from '@kbn/logging/target/mocks';
import { castArray, omit, mapValues } from 'lodash';
import { RuleDataClient } from '../rule_data_client';
import { createRuleDataClientMock } from '../rule_data_client/create_rule_data_client_mock';
import { createLifecycleRuleTypeFactory } from './create_lifecycle_rule_type_factory';

type RuleTestHelpers = ReturnType<typeof createRule>;

function createRule() {
  const ruleDataClientMock = createRuleDataClientMock();

  const factory = createLifecycleRuleTypeFactory({
    ruleDataClient: (ruleDataClientMock as unknown) as RuleDataClient,
    logger: loggerMock.create(),
  });

  let nextAlerts: Array<{ id: string; fields: Record<string, any> }> = [];

  const type = factory({
    actionGroups: [
      {
        id: 'warning',
        name: 'warning',
      },
    ],
    defaultActionGroupId: 'warning',
    executor: async ({ services }) => {
      nextAlerts.forEach((alert) => {
        services.alertWithLifecycle(alert);
      });
      nextAlerts = [];
    },
    id: 'ruleTypeId',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    name: 'ruleTypeName',
    producer: 'producer',
    actionVariables: {
      context: [],
      params: [],
      state: [],
    },
    validate: {
      params: schema.object({}, { unknowns: 'allow' }),
    },
  });

  let state: Record<string, any> = {};
  let previousStartedAt: Date | null;
  const createdAt = new Date('2021-06-16T09:00:00.000Z');

  const scheduleActions = jest.fn();

  const alertInstanceFactory = () => {
    return {
      scheduleActions,
    } as any;
  };

  return {
    alertWithLifecycle: async (alerts: Array<{ id: string; fields: Record<string, any> }>) => {
      nextAlerts = alerts;

      const startedAt = new Date((previousStartedAt ?? createdAt).getTime() + 60000);

      scheduleActions.mockClear();

      state = await type.executor({
        alertId: 'alertId',
        createdBy: 'createdBy',
        name: 'name',
        params: {},
        previousStartedAt,
        startedAt,
        rule: {
          actions: [],
          consumer: 'consumer',
          createdAt,
          createdBy: 'createdBy',
          enabled: true,
          name: 'name',
          notifyWhen: 'onActionGroupChange',
          producer: 'producer',
          ruleTypeId: 'ruleTypeId',
          ruleTypeName: 'ruleTypeName',
          schedule: {
            interval: '1m',
          },
          tags: ['tags'],
          throttle: null,
          updatedAt: createdAt,
          updatedBy: 'updatedBy',
        },
        services: {
          alertInstanceFactory,
          savedObjectsClient: {} as any,
          scopedClusterClient: {} as any,
        },
        spaceId: 'spaceId',
        state,
        tags: ['tags'],
        updatedBy: 'updatedBy',
        namespace: 'namespace',
      });

      previousStartedAt = startedAt;
    },
    scheduleActions,
    ruleDataClientMock,
  };
}

describe('createLifecycleRuleTypeFactory', () => {
  describe('with a new rule', () => {
    let helpers: RuleTestHelpers;

    beforeEach(() => {
      helpers = createRule();
    });

    describe('when writing is disabled', () => {
      beforeEach(() => {
        helpers.ruleDataClientMock.isWriteEnabled.mockReturnValue(false);
      });

      it("doesn't persist anything", async () => {
        await helpers.alertWithLifecycle([
          {
            id: 'opbeans-java',
            fields: {
              'service.name': 'opbeans-java',
            },
          },
        ]);

        expect(helpers.ruleDataClientMock.getWriter().bulk).toHaveBeenCalledTimes(0);
      });
    });

    describe('when alerts are new', () => {
      beforeEach(async () => {
        await helpers.alertWithLifecycle([
          {
            id: 'opbeans-java',
            fields: {
              'service.name': 'opbeans-java',
            },
          },
          {
            id: 'opbeans-node',
            fields: {
              'service.name': 'opbeans-node',
            },
          },
        ]);
      });

      it('writes the correct alerts', () => {
        expect(helpers.ruleDataClientMock.getWriter().bulk).toHaveBeenCalledTimes(1);

        const body = helpers.ruleDataClientMock.getWriter().bulk.mock.calls[0][0].body!;

        const documents = body.filter((op: any) => !('index' in op)) as any[];

        const evaluationDocuments = documents.filter((doc) => doc['event.kind'] === 'event');
        const alertDocuments = documents.filter((doc) => doc['event.kind'] === 'signal');

        expect(evaluationDocuments.length).toBe(2);
        expect(alertDocuments.length).toBe(2);

        expect(
          alertDocuments.every((doc) => doc['kibana.rac.alert.status'] === 'open')
        ).toBeTruthy();

        expect(
          alertDocuments.every((doc) => doc['kibana.rac.alert.duration.us'] === 0)
        ).toBeTruthy();

        expect(alertDocuments.every((doc) => doc['event.action'] === 'open')).toBeTruthy();

        expect(documents.map((doc) => omit(doc, 'kibana.rac.alert.uuid'))).toMatchInlineSnapshot(`
          Array [
            Object {
              "@timestamp": "2021-06-16T09:01:00.000Z",
              "event.action": "open",
              "event.kind": "event",
              "kibana.rac.alert.duration.us": 0,
              "kibana.rac.alert.id": "opbeans-java",
              "kibana.rac.alert.owner": "consumer",
              "kibana.rac.alert.producer": "producer",
              "kibana.rac.alert.start": "2021-06-16T09:01:00.000Z",
              "kibana.rac.alert.status": "open",
              "rule.category": "ruleTypeName",
              "rule.id": "ruleTypeId",
              "rule.name": "name",
              "rule.uuid": "alertId",
              "service.name": "opbeans-java",
              "tags": Array [
                "tags",
              ],
            },
            Object {
              "@timestamp": "2021-06-16T09:01:00.000Z",
              "event.action": "open",
              "event.kind": "event",
              "kibana.rac.alert.duration.us": 0,
              "kibana.rac.alert.id": "opbeans-node",
              "kibana.rac.alert.owner": "consumer",
              "kibana.rac.alert.producer": "producer",
              "kibana.rac.alert.start": "2021-06-16T09:01:00.000Z",
              "kibana.rac.alert.status": "open",
              "rule.category": "ruleTypeName",
              "rule.id": "ruleTypeId",
              "rule.name": "name",
              "rule.uuid": "alertId",
              "service.name": "opbeans-node",
              "tags": Array [
                "tags",
              ],
            },
            Object {
              "@timestamp": "2021-06-16T09:01:00.000Z",
              "event.action": "open",
              "event.kind": "signal",
              "kibana.rac.alert.duration.us": 0,
              "kibana.rac.alert.id": "opbeans-java",
              "kibana.rac.alert.owner": "consumer",
              "kibana.rac.alert.producer": "producer",
              "kibana.rac.alert.start": "2021-06-16T09:01:00.000Z",
              "kibana.rac.alert.status": "open",
              "rule.category": "ruleTypeName",
              "rule.id": "ruleTypeId",
              "rule.name": "name",
              "rule.uuid": "alertId",
              "service.name": "opbeans-java",
              "tags": Array [
                "tags",
              ],
            },
            Object {
              "@timestamp": "2021-06-16T09:01:00.000Z",
              "event.action": "open",
              "event.kind": "signal",
              "kibana.rac.alert.duration.us": 0,
              "kibana.rac.alert.id": "opbeans-node",
              "kibana.rac.alert.owner": "consumer",
              "kibana.rac.alert.producer": "producer",
              "kibana.rac.alert.start": "2021-06-16T09:01:00.000Z",
              "kibana.rac.alert.status": "open",
              "rule.category": "ruleTypeName",
              "rule.id": "ruleTypeId",
              "rule.name": "name",
              "rule.uuid": "alertId",
              "service.name": "opbeans-node",
              "tags": Array [
                "tags",
              ],
            },
          ]
        `);
      });
    });

    describe('when alerts are active', () => {
      beforeEach(async () => {
        await helpers.alertWithLifecycle([
          {
            id: 'opbeans-java',
            fields: {
              'service.name': 'opbeans-java',
            },
          },
          {
            id: 'opbeans-node',
            fields: {
              'service.name': 'opbeans-node',
            },
          },
        ]);

        await helpers.alertWithLifecycle([
          {
            id: 'opbeans-java',
            fields: {
              'service.name': 'opbeans-java',
            },
          },
          {
            id: 'opbeans-node',
            fields: {
              'service.name': 'opbeans-node',
            },
          },
        ]);
      });

      it('writes the correct alerts', () => {
        expect(helpers.ruleDataClientMock.getWriter().bulk).toHaveBeenCalledTimes(2);

        const body = helpers.ruleDataClientMock.getWriter().bulk.mock.calls[1][0].body!;

        const documents = body.filter((op: any) => !('index' in op)) as any[];

        const evaluationDocuments = documents.filter((doc) => doc['event.kind'] === 'event');
        const alertDocuments = documents.filter((doc) => doc['event.kind'] === 'signal');

        expect(evaluationDocuments.length).toBe(2);
        expect(alertDocuments.length).toBe(2);

        expect(
          alertDocuments.every((doc) => doc['kibana.rac.alert.status'] === 'open')
        ).toBeTruthy();
        expect(alertDocuments.every((doc) => doc['event.action'] === 'active')).toBeTruthy();

        expect(alertDocuments.every((doc) => doc['kibana.rac.alert.duration.us'] > 0)).toBeTruthy();
      });
    });

    describe('when alerts recover', () => {
      beforeEach(async () => {
        await helpers.alertWithLifecycle([
          {
            id: 'opbeans-java',
            fields: {
              'service.name': 'opbeans-java',
            },
          },
          {
            id: 'opbeans-node',
            fields: {
              'service.name': 'opbeans-node',
            },
          },
        ]);

        const lastOpbeansNodeDoc = helpers.ruleDataClientMock
          .getWriter()
          .bulk.mock.calls[0][0].body?.concat()
          .reverse()
          .find(
            (doc: any) => !('index' in doc) && doc['service.name'] === 'opbeans-node'
          ) as Record<string, any>;

        const stored = mapValues(lastOpbeansNodeDoc, (val) => {
          return castArray(val);
        });

        helpers.ruleDataClientMock.getReader().search.mockResolvedValueOnce({
          hits: {
            hits: [{ fields: stored } as any],
            total: {
              value: 1,
              relation: 'eq',
            },
          },
          took: 0,
          timed_out: false,
          _shards: {
            failed: 0,
            successful: 1,
            total: 1,
          },
        });

        await helpers.alertWithLifecycle([
          {
            id: 'opbeans-java',
            fields: {
              'service.name': 'opbeans-java',
            },
          },
        ]);
      });

      it('writes the correct alerts', () => {
        expect(helpers.ruleDataClientMock.getWriter().bulk).toHaveBeenCalledTimes(2);

        const body = helpers.ruleDataClientMock.getWriter().bulk.mock.calls[1][0].body!;

        const documents = body.filter((op: any) => !('index' in op)) as any[];

        const opbeansJavaAlertDoc = documents.find(
          (doc) => castArray(doc['service.name'])[0] === 'opbeans-java'
        );
        const opbeansNodeAlertDoc = documents.find(
          (doc) => castArray(doc['service.name'])[0] === 'opbeans-node'
        );

        expect(opbeansJavaAlertDoc['event.action']).toBe('active');
        expect(opbeansJavaAlertDoc['kibana.rac.alert.status']).toBe('open');

        expect(opbeansNodeAlertDoc['event.action']).toBe('close');
        expect(opbeansNodeAlertDoc['kibana.rac.alert.status']).toBe('closed');
      });
    });
  });
});
