/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging/mocks';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../../src/core/server/mocks';
import {
  AlertExecutorOptions,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../../alerting/server';
import { alertsMock } from '../../../alerting/server/mocks';
import {
  ALERT_ID,
  ALERT_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_CONSUMER,
  SPACE_IDS,
} from '../../common/technical_rule_data_field_names';
import { createRuleDataClientMock } from '../rule_data_client/rule_data_client.mock';
import { createLifecycleExecutor } from './create_lifecycle_executor';

describe('createLifecycleExecutor', () => {
  it('wraps and unwraps the original executor state', async () => {
    const logger = loggerMock.create();
    const ruleDataClientMock = createRuleDataClientMock();
    const executor = createLifecycleExecutor(
      logger,
      ruleDataClientMock
    )<{}, TestRuleState, never, never, never>(async (options) => {
      expect(options.state).toEqual(initialRuleState);

      const nextRuleState: TestRuleState = {
        aRuleStateKey: 'NEXT_RULE_STATE_VALUE',
      };

      return nextRuleState;
    });

    const newRuleState = await executor(
      createDefaultAlertExecutorOptions({
        params: {},
        state: { wrapped: initialRuleState, trackedAlerts: {} },
      })
    );

    expect(newRuleState).toEqual({
      wrapped: {
        aRuleStateKey: 'NEXT_RULE_STATE_VALUE',
      },
      trackedAlerts: {},
    });
  });

  it('writes initial documents for newly firing alerts', async () => {
    const logger = loggerMock.create();
    const ruleDataClientMock = createRuleDataClientMock();
    const executor = createLifecycleExecutor(
      logger,
      ruleDataClientMock
    )<{}, TestRuleState, never, never, never>(async ({ services, state }) => {
      services.alertWithLifecycle({
        id: 'TEST_ALERT_0',
        fields: {},
      });
      services.alertWithLifecycle({
        id: 'TEST_ALERT_1',
        fields: {},
      });

      return state;
    });

    await executor(
      createDefaultAlertExecutorOptions({
        params: {},
        state: { wrapped: initialRuleState, trackedAlerts: {} },
      })
    );

    expect(ruleDataClientMock.getWriter().bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        body: [
          // alert documents
          { index: { _id: expect.any(String) } },
          expect.objectContaining({
            [ALERT_ID]: 'TEST_ALERT_0',
            [ALERT_STATUS]: 'open',
            [EVENT_ACTION]: 'open',
            [EVENT_KIND]: 'signal',
          }),
          { index: { _id: expect.any(String) } },
          expect.objectContaining({
            [ALERT_ID]: 'TEST_ALERT_1',
            [ALERT_STATUS]: 'open',
            [EVENT_ACTION]: 'open',
            [EVENT_KIND]: 'signal',
          }),
        ],
      })
    );
    expect(ruleDataClientMock.getWriter().bulk).not.toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.arrayContaining([
          // evaluation documents
          { index: {} },
          expect.objectContaining({
            [EVENT_KIND]: 'event',
          }),
        ]),
      })
    );
  });

  it('overwrites existing documents for repeatedly firing alerts', async () => {
    const logger = loggerMock.create();
    const ruleDataClientMock = createRuleDataClientMock();
    ruleDataClientMock.getReader().search.mockResolvedValue({
      hits: {
        hits: [
          {
            fields: {
              [ALERT_ID]: 'TEST_ALERT_0',
              [ALERT_RULE_CONSUMER]: 'CONSUMER',
              [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
              labels: { LABEL_0_KEY: 'LABEL_0_VALUE' }, // this must not show up in the written doc
            },
          },
          {
            fields: {
              [ALERT_ID]: 'TEST_ALERT_1',
              [ALERT_RULE_CONSUMER]: 'CONSUMER',
              [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
              labels: { LABEL_0_KEY: 'LABEL_0_VALUE' }, // this must not show up in the written doc
            },
          },
        ],
      },
    } as any);
    const executor = createLifecycleExecutor(
      logger,
      ruleDataClientMock
    )<{}, TestRuleState, never, never, never>(async ({ services, state }) => {
      services.alertWithLifecycle({
        id: 'TEST_ALERT_0',
        fields: {},
      });
      services.alertWithLifecycle({
        id: 'TEST_ALERT_1',
        fields: {},
      });

      return state;
    });

    await executor(
      createDefaultAlertExecutorOptions({
        alertId: 'TEST_ALERT_0',
        params: {},
        state: {
          wrapped: initialRuleState,
          trackedAlerts: {
            TEST_ALERT_0: {
              alertId: 'TEST_ALERT_0',
              alertUuid: 'TEST_ALERT_0_UUID',
              started: '2020-01-01T12:00:00.000Z',
            },
            TEST_ALERT_1: {
              alertId: 'TEST_ALERT_1',
              alertUuid: 'TEST_ALERT_1_UUID',
              started: '2020-01-02T12:00:00.000Z',
            },
          },
        },
      })
    );

    expect(ruleDataClientMock.getWriter().bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        body: [
          // alert document
          { index: { _id: 'TEST_ALERT_0_UUID' } },
          expect.objectContaining({
            [ALERT_ID]: 'TEST_ALERT_0',
            [ALERT_STATUS]: 'open',
            [EVENT_ACTION]: 'active',
            [EVENT_KIND]: 'signal',
          }),
          { index: { _id: 'TEST_ALERT_1_UUID' } },
          expect.objectContaining({
            [ALERT_ID]: 'TEST_ALERT_1',
            [ALERT_STATUS]: 'open',
            [EVENT_ACTION]: 'active',
            [EVENT_KIND]: 'signal',
          }),
        ],
      })
    );
    expect(ruleDataClientMock.getWriter().bulk).not.toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.arrayContaining([
          // evaluation documents
          { index: {} },
          expect.objectContaining({
            [EVENT_KIND]: 'event',
          }),
        ]),
      })
    );
  });

  it('updates existing documents for recovered alerts', async () => {
    const logger = loggerMock.create();
    const ruleDataClientMock = createRuleDataClientMock();
    ruleDataClientMock.getReader().search.mockResolvedValue({
      hits: {
        hits: [
          {
            fields: {
              '@timestamp': '',
              [ALERT_ID]: 'TEST_ALERT_0',
              [ALERT_RULE_CONSUMER]: 'CONSUMER',
              [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
              [SPACE_IDS]: ['fake-space-id'],
              labels: { LABEL_0_KEY: 'LABEL_0_VALUE' }, // this must show up in the written doc
            },
          },
          {
            fields: {
              '@timestamp': '',
              [ALERT_ID]: 'TEST_ALERT_1',
              [ALERT_RULE_CONSUMER]: 'CONSUMER',
              [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
              [SPACE_IDS]: ['fake-space-id'],
              labels: { LABEL_0_KEY: 'LABEL_0_VALUE' }, // this must not show up in the written doc
            },
          },
        ],
      },
    } as any);
    const executor = createLifecycleExecutor(
      logger,
      ruleDataClientMock
    )<{}, TestRuleState, never, never, never>(async ({ services, state }) => {
      // TEST_ALERT_0 has recovered
      services.alertWithLifecycle({
        id: 'TEST_ALERT_1',
        fields: {},
      });

      return state;
    });

    await executor(
      createDefaultAlertExecutorOptions({
        alertId: 'TEST_ALERT_0',
        params: {},
        state: {
          wrapped: initialRuleState,
          trackedAlerts: {
            TEST_ALERT_0: {
              alertId: 'TEST_ALERT_0',
              alertUuid: 'TEST_ALERT_0_UUID',
              started: '2020-01-01T12:00:00.000Z',
            },
            TEST_ALERT_1: {
              alertId: 'TEST_ALERT_1',
              alertUuid: 'TEST_ALERT_1_UUID',
              started: '2020-01-02T12:00:00.000Z',
            },
          },
        },
      })
    );

    expect(ruleDataClientMock.getWriter().bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.arrayContaining([
          // alert document
          { index: { _id: 'TEST_ALERT_0_UUID' } },
          expect.objectContaining({
            [ALERT_ID]: 'TEST_ALERT_0',
            [ALERT_STATUS]: 'closed',
            labels: { LABEL_0_KEY: 'LABEL_0_VALUE' },
            [EVENT_ACTION]: 'close',
            [EVENT_KIND]: 'signal',
          }),
          { index: { _id: 'TEST_ALERT_1_UUID' } },
          expect.objectContaining({
            [ALERT_ID]: 'TEST_ALERT_1',
            [ALERT_STATUS]: 'open',
            [EVENT_ACTION]: 'active',
            [EVENT_KIND]: 'signal',
          }),
        ]),
      })
    );
    expect(ruleDataClientMock.getWriter().bulk).not.toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.arrayContaining([
          // evaluation documents
          { index: {} },
          expect.objectContaining({
            [EVENT_KIND]: 'event',
          }),
        ]),
      })
    );
  });
});

type TestRuleState = Record<string, unknown> & {
  aRuleStateKey: string;
};

const initialRuleState: TestRuleState = {
  aRuleStateKey: 'INITIAL_RULE_STATE_VALUE',
};

const createDefaultAlertExecutorOptions = <
  Params extends AlertTypeParams = never,
  State extends AlertTypeState = never,
  InstanceState extends AlertInstanceState = {},
  InstanceContext extends AlertInstanceContext = {},
  ActionGroupIds extends string = ''
>({
  alertId = 'ALERT_ID',
  ruleName = 'ALERT_RULE_NAME',
  params,
  state,
  createdAt = new Date(),
  startedAt = new Date(),
  updatedAt = new Date(),
}: {
  alertId?: string;
  ruleName?: string;
  params: Params;
  state: State;
  createdAt?: Date;
  startedAt?: Date;
  updatedAt?: Date;
}): AlertExecutorOptions<Params, State, InstanceState, InstanceContext, ActionGroupIds> => ({
  alertId,
  createdBy: 'CREATED_BY',
  startedAt,
  name: ruleName,
  rule: {
    updatedBy: null,
    tags: [],
    name: ruleName,
    createdBy: null,
    actions: [],
    enabled: true,
    consumer: 'CONSUMER',
    producer: 'ALERT_PRODUCER',
    schedule: { interval: '1m' },
    throttle: null,
    createdAt,
    updatedAt,
    notifyWhen: null,
    ruleTypeId: 'RULE_TYPE_ID',
    ruleTypeName: 'RULE_TYPE_NAME',
  },
  tags: [],
  params,
  spaceId: 'SPACE_ID',
  services: {
    alertInstanceFactory: alertsMock.createAlertServices<InstanceState, InstanceContext>()
      .alertInstanceFactory,
    savedObjectsClient: savedObjectsClientMock.create(),
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
  },
  state,
  updatedBy: null,
  previousStartedAt: null,
  namespace: undefined,
});
