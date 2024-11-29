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
  ALERT_TIME_RANGE,
} from '@kbn/rule-data-utils';
import { loggerMock } from '@kbn/logging-mocks';
import { castArray, omit } from 'lodash';
import { createRuleDataClientMock } from '../rule_data_client/rule_data_client.mock';
import { createLifecycleRuleTypeFactory } from './create_lifecycle_rule_type_factory';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common/rules_settings';

type RuleTestHelpers = ReturnType<typeof createRule>;

function createRule(shouldWriteAlerts: boolean = true) {
  const ruleDataClientMock = createRuleDataClientMock();

  const factory = createLifecycleRuleTypeFactory({
    ruleDataClient: ruleDataClientMock,
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
    actionVariables: {
      context: [],
      params: [],
      state: [],
    },
    defaultActionGroupId: 'warning',
    executor: async ({ services }) => {
      nextAlerts.forEach((alert) => {
        services.alertWithLifecycle(alert);
      });
      nextAlerts = [];
      return { state: {} };
    },
    id: 'ruleTypeId',
    isExportable: true,
    minimumLicenseRequired: 'basic',
    name: 'ruleTypeName',
    category: 'test',
    producer: 'producer',
    validate: {
      params: schema.object(
        {},
        {
          unknowns: 'allow',
        }
      ),
    },
  });

  let state: Record<string, any> = {};
  let previousStartedAt: Date | null;
  const createdAt = new Date('2021-06-16T09:00:00.000Z');

  const scheduleActions = jest.fn();

  let uuidCounter = 1;
  const getUuid = jest.fn(() => `uuid-${uuidCounter++}`);

  const alertFactory = {
    create: () => {
      return {
        scheduleActions,
        getUuid,
      } as any;
    },
    alertLimit: {
      getValue: () => 1000,
      setLimitReached: () => {},
    },
    done: () => ({ getRecoveredAlerts: () => [] }),
  };

  return {
    alertWithLifecycle: async (alerts: Array<{ id: string; fields: Record<string, any> }>) => {
      nextAlerts = alerts;

      const startedAt = new Date((previousStartedAt ?? createdAt).getTime() + 60000);

      scheduleActions.mockClear();

      ({ state } = ((await type.executor({
        executionId: 'b33f65d7-6e8b-4aae-8d20-c93613dec9f9',
        logger: loggerMock.create(),
        namespace: 'namespace',
        params: { threshold: 1, operator: '>' },
        previousStartedAt,
        rule: {
          id: 'alertId',
          actions: [],
          consumer: 'consumer',
          createdAt,
          createdBy: 'createdBy',
          enabled: true,
          muteAll: false,
          name: 'name',
          notifyWhen: 'onActionGroupChange',
          producer: 'producer',
          revision: 0,
          ruleTypeId: 'ruleTypeId',
          ruleTypeName: 'ruleTypeName',
          schedule: {
            interval: '1m',
          },
          snoozeSchedule: [],
          tags: ['tags'],
          throttle: null,
          updatedAt: createdAt,
          updatedBy: 'updatedBy',
        },
        services: {
          alertsClient: null,
          alertFactory,
          savedObjectsClient: {} as any,
          scopedClusterClient: {} as any,
          search: {} as any,
          getMaintenanceWindowIds: async () => [],
          getSearchSourceClient: async () => ({} as ISearchStartSearchSource),
          shouldStopExecution: () => false,
          shouldWriteAlerts: () => shouldWriteAlerts,
          uiSettingsClient: {} as any,
          share: {} as SharePluginStart,
          getDataViews: async () => dataViewPluginMocks.createStartContract(),
        },
        spaceId: 'spaceId',
        startedAt,
        startedAtOverridden: false,
        state,
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange: () => {
          const date = new Date(Date.now()).toISOString();
          return { dateStart: date, dateEnd: date };
        },
        isServerless: false,
      })) ?? {}) as Record<string, any>);

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

        expect((await helpers.ruleDataClientMock.getWriter()).bulk).toHaveBeenCalledTimes(0);
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

        expect((await helpers.ruleDataClientMock.getWriter()).bulk).toHaveBeenCalledTimes(0);
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

      it('writes the correct alerts', async () => {
        expect((await helpers.ruleDataClientMock.getWriter()).bulk).toHaveBeenCalledTimes(1);

        const body = (await helpers.ruleDataClientMock.getWriter()).bulk.mock.calls[0][0].body!;

        const documents: any[] = body.filter((op: any) => !isOpDoc(op));

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
              "kibana.alert.consecutive_matches": 1,
              "kibana.alert.duration.us": 0,
              "kibana.alert.flapping": false,
              "kibana.alert.instance.id": "opbeans-java",
              "kibana.alert.rule.category": "ruleTypeName",
              "kibana.alert.rule.consumer": "consumer",
              "kibana.alert.rule.execution.uuid": "b33f65d7-6e8b-4aae-8d20-c93613dec9f9",
              "kibana.alert.rule.name": "name",
              "kibana.alert.rule.parameters": Object {
                "operator": ">",
                "threshold": 1,
              },
              "kibana.alert.rule.producer": "producer",
              "kibana.alert.rule.revision": 0,
              "kibana.alert.rule.rule_type_id": "ruleTypeId",
              "kibana.alert.rule.tags": Array [
                "tags",
              ],
              "kibana.alert.rule.uuid": "alertId",
              "kibana.alert.start": "2021-06-16T09:01:00.000Z",
              "kibana.alert.status": "active",
              "kibana.alert.time_range": Object {
                "gte": "2021-06-16T09:01:00.000Z",
              },
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
              "kibana.alert.consecutive_matches": 1,
              "kibana.alert.duration.us": 0,
              "kibana.alert.flapping": false,
              "kibana.alert.instance.id": "opbeans-node",
              "kibana.alert.rule.category": "ruleTypeName",
              "kibana.alert.rule.consumer": "consumer",
              "kibana.alert.rule.execution.uuid": "b33f65d7-6e8b-4aae-8d20-c93613dec9f9",
              "kibana.alert.rule.name": "name",
              "kibana.alert.rule.parameters": Object {
                "operator": ">",
                "threshold": 1,
              },
              "kibana.alert.rule.producer": "producer",
              "kibana.alert.rule.revision": 0,
              "kibana.alert.rule.rule_type_id": "ruleTypeId",
              "kibana.alert.rule.tags": Array [
                "tags",
              ],
              "kibana.alert.rule.uuid": "alertId",
              "kibana.alert.start": "2021-06-16T09:01:00.000Z",
              "kibana.alert.status": "active",
              "kibana.alert.time_range": Object {
                "gte": "2021-06-16T09:01:00.000Z",
              },
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
        const lastOpbeansNodeDoc = (
          await helpers.ruleDataClientMock.getWriter()
        ).bulk.mock.calls[0][0].body
          ?.concat()
          .reverse()
          .find((doc: any) => !isOpDoc(doc) && doc['service.name'] === 'opbeans-node') as Record<
          string,
          any
        >;

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

      it('writes the correct alerts', async () => {
        expect((await helpers.ruleDataClientMock.getWriter()).bulk).toHaveBeenCalledTimes(2);
        const body = (await helpers.ruleDataClientMock.getWriter()).bulk.mock.calls[1][0].body!;

        const documents: any[] = body.filter((op: any) => !isOpDoc(op));

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

        const lastOpbeansNodeDoc = (
          await helpers.ruleDataClientMock.getWriter()
        ).bulk.mock.calls[0][0].body
          ?.concat()
          .reverse()
          .find((doc: any) => !isOpDoc(doc) && doc['service.name'] === 'opbeans-node') as Record<
          string,
          any
        >;

        helpers.ruleDataClientMock.getReader().search.mockResolvedValueOnce({
          hits: {
            hits: [
              {
                _source: lastOpbeansNodeDoc,
                _index: '.alerts-a',
                _primary_term: 4,
                _seq_no: 2,
              } as any,
            ],
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

      it('writes the correct alerts', async () => {
        expect((await helpers.ruleDataClientMock.getWriter()).bulk).toHaveBeenCalledTimes(2);

        const body = (await helpers.ruleDataClientMock.getWriter()).bulk.mock.calls[1][0].body!;

        const documents: any[] = body.filter((op: any) => !isOpDoc(op));

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
        expect(opbeansNodeAlertDoc[ALERT_TIME_RANGE]).toEqual({
          gte: '2021-06-16T09:01:00.000Z',
          lte: '2021-06-16T09:02:00.000Z',
        });
      });
    });
  });
});

function isOpDoc(doc: any) {
  if (doc?.index?._id) return true;
  if (doc?.create?._id) return true;
  return false;
}
