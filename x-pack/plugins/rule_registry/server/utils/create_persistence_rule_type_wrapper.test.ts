/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { RuleDataClient } from '../rule_data_client';
import { createRuleDataClientMock } from '../rule_data_client/rule_data_client.mock';
import { createPersistenceRuleTypeWrapper } from './create_persistence_rule_type_wrapper';
import { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { WRITING_DISABLED_VIA_CONFIG_ERROR_MSG } from '../translations';

type RuleTestHelpers = ReturnType<typeof createRule>;

function createRule(shouldWriteAlerts: boolean = true) {
  const ruleDataClientMock = createRuleDataClientMock();

  const factory = createPersistenceRuleTypeWrapper({
    ruleDataClient: ruleDataClientMock as unknown as RuleDataClient,
    logger: loggerMock.create(),
  });

  let nextAlerts: Array<{ _id: string; _source: any }> = [];

  const type = factory({
    actionGroups: [
      {
        id: 'warning',
        name: 'warning',
      },
    ],
    defaultActionGroupId: 'warning',
    executor: async ({ services }) => {
      const state = await services.alertWithPersistence(nextAlerts, true);
      nextAlerts = [];
      return state as any;
    },
    id: 'ruleTypeId',
    minimumLicenseRequired: 'basic',
    isExportable: true,
    name: 'ruleTypeName',
    producer: 'producer',
  });

  let state: Record<string, any> = {};
  let previousStartedAt: Date | null;
  const createdAt = new Date('2022-06-20T09:00:00.000Z');

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
    alertWithPersistence: async (alerts: Array<{ _id: string; _source: any }>) => {
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
          searchSourceClient: {} as ISearchStartSearchSource,
        },
        spaceId: 'spaceId',
        state,
        tags: ['tags'],
        updatedBy: 'updatedBy',
        executionId: 'b33f65d7-6e8b-4aae-8d20-c93613dec9f9',
      })) ?? {}) as Record<string, any>;

      previousStartedAt = startedAt;

      return state;
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

      it("doesn't persist anything and returns 'writing disabled via config' error", async () => {
        const result = await helpers.alertWithPersistence([
          {
            _id: 'alert-1',
            _source: {},
          },
        ]);

        expect(helpers.ruleDataClientMock.getWriter().bulk).toHaveBeenCalledTimes(0);

        expect(result).toEqual({
          createdAlerts: [],
          errors: {
            [WRITING_DISABLED_VIA_CONFIG_ERROR_MSG]: {
              count: 1,
              statusCode: 500,
            },
          },
        });
      });

      it("doesn't persist anything and returns 'last bulk operation' error", async () => {
        helpers.ruleDataClientMock.lastWriterBulkError = new Error('Bulk call failed.');
        const result = await helpers.alertWithPersistence([
          {
            _id: 'alert-1',
            _source: {},
          },
        ]);

        expect(helpers.ruleDataClientMock.getWriter().bulk).toHaveBeenCalledTimes(0);

        expect(result).toEqual({
          createdAlerts: [],
          errors: {
            ['Bulk call failed.']: {
              count: 1,
              statusCode: 500,
            },
          },
        });
      });

      it("doesn't persist anything and returns 'initialization' error", async () => {
        helpers.ruleDataClientMock.getReader().search.mockResolvedValueOnce({} as any);
        helpers.ruleDataClientMock.isWriteEnabled.mockReturnValue(false).mockReturnValueOnce(true);
        helpers.ruleDataClientMock.lastWriterBulkError = new Error('Writer initialization error.');

        const result = await helpers.alertWithPersistence([
          {
            _id: 'alert-1',
            _source: {},
          },
        ]);

        expect(helpers.ruleDataClientMock.getWriter().bulk).toHaveBeenCalledTimes(1);

        expect(result).toEqual({
          createdAlerts: [],
          errors: {
            ['Writer initialization error.']: {
              count: 1,
              statusCode: 500,
            },
          },
        });
      });
    });

    describe('when rule is cancelled due to timeout and config flags indicate to skip actions', () => {
      beforeEach(() => {
        helpers = createRule(false);
        helpers.ruleDataClientMock.isWriteEnabled.mockReturnValue(true);
      });

      it("doesn't persist anything", async () => {
        const result = await helpers.alertWithPersistence([
          {
            _id: 'alert-1',
            _source: {},
          },
        ]);

        expect(helpers.ruleDataClientMock.getWriter().bulk).toHaveBeenCalledTimes(0);
        expect(result).toEqual({ createdAlerts: [], errors: {} });
      });
    });

    describe('when alerts are new', () => {
      beforeEach(async () => {
        helpers.ruleDataClientMock.getReader().search.mockResolvedValueOnce({} as any);
        await helpers.alertWithPersistence([
          {
            _id: 'alert-1',
            _source: {
              category: 'category-1',
            },
          },
          {
            _id: 'alert-2',
            _source: {
              category: 'category-2',
            },
          },
        ]);
      });

      it('writes the correct alerts', () => {
        expect(helpers.ruleDataClientMock.getWriter().bulk).toHaveBeenCalledTimes(1);

        const body = helpers.ruleDataClientMock.getWriter().bulk.mock.calls[0][0].body!;

        const documents = body.filter((op: any) => !('create' in op)) as any[];
        expect(documents.length).toBe(2);

        expect(documents).toMatchInlineSnapshot(`
          Array [
            Object {
              "@timestamp": "2022-06-20T09:01:00.000Z",
              "category": "category-1",
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
              "kibana.space_ids": Array [
                "spaceId",
              ],
              "kibana.version": "7.16.0",
            },
            Object {
              "@timestamp": "2022-06-20T09:01:00.000Z",
              "category": "category-2",
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
              "kibana.space_ids": Array [
                "spaceId",
              ],
              "kibana.version": "7.16.0",
            },
          ]
        `);
      });
    });
  });
});
