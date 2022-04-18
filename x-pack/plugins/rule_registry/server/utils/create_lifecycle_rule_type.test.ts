/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  ALERT_DURATION,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { loggerMock } from '@kbn/logging-mocks';
import { castArray, omit } from 'lodash';
import { RuleDataClient } from '../rule_data_client';
import { createRuleDataClientMock } from '../rule_data_client/rule_data_client.mock';
import { createLifecycleRuleTypeFactory } from './create_lifecycle_rule_type_factory';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';

type RuleTestHelpers = ReturnType<typeof createRule>;

function createRule(shouldWriteAlerts: boolean = true) {
  const ruleDataClientMock = createRuleDataClientMock();

  const factory = createLifecycleRuleTypeFactory({
    ruleDataClient: ruleDataClientMock as unknown as RuleDataClient,
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

  const alertFactory = {
    create: () => {
      return {
        scheduleActions,
      } as any;
    },
    done: () => ({ getRecoveredAlerts: () => [] }),
  };

  return {
    alertWithLifecycle: async (alerts: Array<{ id: string; fields: Record<string, any> }>) => {
      nextAlerts = alerts;

      const startedAt = new Date((previousStartedAt ?? createdAt).getTime() + 60000);

      scheduleActions.mockClear();

      state = ((await type.executor({
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
          alertFactory,
          savedObjectsClient: {} as any,
          uiSettingsClient: {} as any,
          scopedClusterClient: {} as any,
          shouldWriteAlerts: () => shouldWriteAlerts,
          shouldStopExecution: () => false,
          search: {} as any,
          searchSourceClient: Promise.resolve({} as ISearchStartSearchSource),
        },
        spaceId: 'spaceId',
        state,
        tags: ['tags'],
        updatedBy: 'updatedBy',
        namespace: 'namespace',
        executionId: 'b33f65d7-6e8b-4aae-8d20-c93613dec9f9',
      })) ?? {}) as Record<string, any>;

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

    describe('when rule is cancelled due to timeout and config flags indicate to skip actions', () => {
      beforeEach(() => {
        helpers = createRule(false);
        helpers.ruleDataClientMock.isWriteEnabled.mockReturnValue(true);
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

        expect(evaluationDocuments.length).toBe(0);
        expect(alertDocuments.length).toBe(2);

        expect(
          alertDocuments.every((doc) => doc[ALERT_STATUS] === ALERT_STATUS_ACTIVE)
        ).toBeTruthy();

        expect(alertDocuments.every((doc) => doc[ALERT_DURATION] === 0)).toBeTruthy();

        expect(alertDocuments.every((doc) => doc['event.action'] === 'open')).toBeTruthy();

        expect(documents.map((doc) => omit(doc, ALERT_UUID))).toMatchInlineSnapshot(`
          Array [
            Object {
              "@timestamp": "2021-06-16T09:01:00.000Z",
              "event.action": "open",
              "event.kind": "signal",
              "kibana.alert.duration.us": 0,
              "kibana.alert.instance.id": "opbeans-java",
              "kibana.alert.rule.category": "ruleTypeName",
              "kibana.alert.rule.consumer": "consumer",
              "kibana.alert.rule.execution.uuid": "b33f65d7-6e8b-4aae-8d20-c93613dec9f9",
              "kibana.alert.rule.name": "name",
              "kibana.alert.rule.producer": "producer",
              "kibana.alert.rule.rule_type_id": "ruleTypeId",
              "kibana.alert.rule.tags": Array [
                "tags",
              ],
              "kibana.alert.rule.uuid": "alertId",
              "kibana.alert.start": "2021-06-16T09:01:00.000Z",
              "kibana.alert.status": "active",
              "kibana.alert.workflow_status": "open",
              "kibana.space_ids": Array [
                "spaceId",
              ],
              "kibana.version": "7.16.0",
              "service.name": "opbeans-java",
              "tags": Array [
                "tags",
              ],
            },
            Object {
              "@timestamp": "2021-06-16T09:01:00.000Z",
              "event.action": "open",
              "event.kind": "signal",
              "kibana.alert.duration.us": 0,
              "kibana.alert.instance.id": "opbeans-node",
              "kibana.alert.rule.category": "ruleTypeName",
              "kibana.alert.rule.consumer": "consumer",
              "kibana.alert.rule.execution.uuid": "b33f65d7-6e8b-4aae-8d20-c93613dec9f9",
              "kibana.alert.rule.name": "name",
              "kibana.alert.rule.producer": "producer",
              "kibana.alert.rule.rule_type_id": "ruleTypeId",
              "kibana.alert.rule.tags": Array [
                "tags",
              ],
              "kibana.alert.rule.uuid": "alertId",
              "kibana.alert.start": "2021-06-16T09:01:00.000Z",
              "kibana.alert.status": "active",
              "kibana.alert.workflow_status": "open",
              "kibana.space_ids": Array [
                "spaceId",
              ],
              "kibana.version": "7.16.0",
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

        // TODO mock the resolved value before calling alertWithLifecycle again
        const lastOpbeansNodeDoc = helpers.ruleDataClientMock
          .getWriter()
          .bulk.mock.calls[0][0].body?.concat()
          .reverse()
          .find(
            (doc: any) => !('index' in doc) && doc['service.name'] === 'opbeans-node'
          ) as Record<string, any>;

        // @ts-ignore 4.3.5 upgrade
        helpers.ruleDataClientMock.getReader().search.mockResolvedValueOnce({
          hits: {
            hits: [{ _source: lastOpbeansNodeDoc } as any],
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
          {
            id: 'opbeans-node',
            fields: {
              'service.name': 'opbeans-node',
              'kibana.alert.workflow_status': 'closed',
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

        expect(evaluationDocuments.length).toBe(0);
        expect(alertDocuments.length).toBe(2);

        expect(
          alertDocuments.every((doc) => doc[ALERT_STATUS] === ALERT_STATUS_ACTIVE)
        ).toBeTruthy();
        expect(alertDocuments.every((doc) => doc['event.action'] === 'active')).toBeTruthy();

        expect(alertDocuments.every((doc) => doc[ALERT_DURATION] > 0)).toBeTruthy();
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

        helpers.ruleDataClientMock.getReader().search.mockResolvedValueOnce({
          hits: {
            hits: [{ _source: lastOpbeansNodeDoc } as any],
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
        expect(opbeansJavaAlertDoc[ALERT_STATUS]).toBe(ALERT_STATUS_ACTIVE);

        expect(opbeansNodeAlertDoc['event.action']).toBe('close');
        expect(opbeansNodeAlertDoc[ALERT_STATUS]).toBe(ALERT_STATUS_RECOVERED);
      });
    });
  });
});
