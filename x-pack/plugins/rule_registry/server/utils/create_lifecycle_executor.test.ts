/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { pick } from 'lodash';
import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_WORKFLOW_STATUS,
  ALERT_UUID,
  EVENT_ACTION,
  EVENT_KIND,
  SPACE_IDS,
  ALERT_FLAPPING,
} from '../../common/technical_rule_data_field_names';
import { createRuleDataClientMock } from '../rule_data_client/rule_data_client.mock';
import { createLifecycleExecutor } from './create_lifecycle_executor';
import { createDefaultAlertExecutorOptions } from './rule_executor.test_helpers';

describe('createLifecycleExecutor', () => {
  it('wraps and unwraps the original executor state', async () => {
    const logger = loggerMock.create();
    const ruleDataClientMock = createRuleDataClientMock();
    // @ts-ignore 4.3.5 upgrade - Expression produces a union type that is too complex to represent.ts(2590)
    const executor = createLifecycleExecutor(
      logger,
      ruleDataClientMock
    )<{}, TestRuleState, never, never, never>(async (options) => {
      expect(options.state).toEqual(initialRuleState);

      const nextRuleState: TestRuleState = {
        aRuleStateKey: 'NEXT_RULE_STATE_VALUE',
      };

      return { state: nextRuleState };
    });

    const newExecutorResult = await executor(
      createDefaultAlertExecutorOptions({
        params: {},
        state: { wrapped: initialRuleState, trackedAlerts: {}, trackedAlertsRecovered: {} },
        logger,
      })
    );

    expect(newExecutorResult.state).toEqual({
      wrapped: {
        aRuleStateKey: 'NEXT_RULE_STATE_VALUE',
      },
      trackedAlerts: {},
      trackedAlertsRecovered: {},
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

      return { state };
    });

    await executor(
      createDefaultAlertExecutorOptions({
        params: {},
        state: { wrapped: initialRuleState, trackedAlerts: {}, trackedAlertsRecovered: {} },
        logger,
      })
    );

    expect((await ruleDataClientMock.getWriter()).bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        body: [
          // alert documents
          { index: { _id: expect.any(String) } },
          expect.objectContaining({
            [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
            [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
            [EVENT_ACTION]: 'open',
            [EVENT_KIND]: 'signal',
          }),
          { index: { _id: expect.any(String) } },
          expect.objectContaining({
            [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
            [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
            [EVENT_ACTION]: 'open',
            [EVENT_KIND]: 'signal',
          }),
        ],
      })
    );
    expect((await ruleDataClientMock.getWriter()).bulk).not.toHaveBeenCalledWith(
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

  it('updates existing documents for repeatedly firing alerts', async () => {
    const logger = loggerMock.create();
    const ruleDataClientMock = createRuleDataClientMock();
    ruleDataClientMock.getReader().search.mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              '@timestamp': '',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
              [ALERT_UUID]: 'ALERT_0_UUID',
              [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
              [ALERT_RULE_CONSUMER]: 'CONSUMER',
              [ALERT_RULE_NAME]: 'NAME',
              [ALERT_RULE_PRODUCER]: 'PRODUCER',
              [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
              [ALERT_RULE_UUID]: 'RULE_UUID',
              [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
              [ALERT_WORKFLOW_STATUS]: 'closed',
              [SPACE_IDS]: ['fake-space-id'],
              labels: { LABEL_0_KEY: 'LABEL_0_VALUE' }, // this must show up in the written doc
            },
          },
          {
            _source: {
              '@timestamp': '',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
              [ALERT_UUID]: 'ALERT_1_UUID',
              [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
              [ALERT_RULE_CONSUMER]: 'CONSUMER',
              [ALERT_RULE_NAME]: 'NAME',
              [ALERT_RULE_PRODUCER]: 'PRODUCER',
              [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
              [ALERT_RULE_UUID]: 'RULE_UUID',
              [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
              [ALERT_WORKFLOW_STATUS]: 'open',
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
      services.alertWithLifecycle({
        id: 'TEST_ALERT_0',
        fields: {},
      });
      services.alertWithLifecycle({
        id: 'TEST_ALERT_1',
        fields: {},
      });

      return { state };
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
              flappingHistory: [],
              flapping: false,
            },
            TEST_ALERT_1: {
              alertId: 'TEST_ALERT_1',
              alertUuid: 'TEST_ALERT_1_UUID',
              started: '2020-01-02T12:00:00.000Z',
              flappingHistory: [],
              flapping: false,
            },
          },
          trackedAlertsRecovered: {},
        },
        logger,
      })
    );

    expect((await ruleDataClientMock.getWriter()).bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        body: [
          // alert document
          { index: { _id: 'TEST_ALERT_0_UUID' } },
          expect.objectContaining({
            [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
            [ALERT_WORKFLOW_STATUS]: 'closed',
            [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
            labels: { LABEL_0_KEY: 'LABEL_0_VALUE' },

            [EVENT_ACTION]: 'active',
            [EVENT_KIND]: 'signal',
          }),
          { index: { _id: 'TEST_ALERT_1_UUID' } },
          expect.objectContaining({
            [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
            [ALERT_WORKFLOW_STATUS]: 'open',
            [ALERT_STATUS]: ALERT_STATUS_ACTIVE,

            [EVENT_ACTION]: 'active',
            [EVENT_KIND]: 'signal',
          }),
        ],
      })
    );
    expect((await ruleDataClientMock.getWriter()).bulk).not.toHaveBeenCalledWith(
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
            _source: {
              '@timestamp': '',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
              [ALERT_UUID]: 'ALERT_0_UUID',
              [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
              [ALERT_RULE_CONSUMER]: 'CONSUMER',
              [ALERT_RULE_NAME]: 'NAME',
              [ALERT_RULE_PRODUCER]: 'PRODUCER',
              [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
              [ALERT_RULE_UUID]: 'RULE_UUID',
              [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
              [SPACE_IDS]: ['fake-space-id'],
              labels: { LABEL_0_KEY: 'LABEL_0_VALUE' }, // this must show up in the written doc
            },
          },
          {
            _source: {
              '@timestamp': '',
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
              [ALERT_UUID]: 'ALERT_1_UUID',
              [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
              [ALERT_RULE_CONSUMER]: 'CONSUMER',
              [ALERT_RULE_NAME]: 'NAME',
              [ALERT_RULE_PRODUCER]: 'PRODUCER',
              [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
              [ALERT_RULE_UUID]: 'RULE_UUID',
              [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
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

      return { state };
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
              flappingHistory: [],
              flapping: false,
            },
            TEST_ALERT_1: {
              alertId: 'TEST_ALERT_1',
              alertUuid: 'TEST_ALERT_1_UUID',
              started: '2020-01-02T12:00:00.000Z',
              flappingHistory: [],
              flapping: false,
            },
          },
          trackedAlertsRecovered: {},
        },
        logger,
      })
    );

    expect((await ruleDataClientMock.getWriter()).bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.arrayContaining([
          // alert document
          { index: { _id: 'TEST_ALERT_0_UUID' } },
          expect.objectContaining({
            [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
            [ALERT_STATUS]: ALERT_STATUS_RECOVERED,
            labels: { LABEL_0_KEY: 'LABEL_0_VALUE' },
            [EVENT_ACTION]: 'close',
            [EVENT_KIND]: 'signal',
          }),
          { index: { _id: 'TEST_ALERT_1_UUID' } },
          expect.objectContaining({
            [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
            [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
            [EVENT_ACTION]: 'active',
            [EVENT_KIND]: 'signal',
          }),
        ]),
      })
    );
    expect((await ruleDataClientMock.getWriter()).bulk).not.toHaveBeenCalledWith(
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

  it('does not write alert documents when rule execution is cancelled and feature flags indicate to skip', async () => {
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

      return { state: nextRuleState };
    });

    await executor(
      createDefaultAlertExecutorOptions({
        params: {},
        state: { wrapped: initialRuleState, trackedAlerts: {}, trackedAlertsRecovered: {} },
        shouldWriteAlerts: false,
        logger,
      })
    );

    expect((await ruleDataClientMock.getWriter()).bulk).not.toHaveBeenCalled();
  });

  it('throws error when writer initialization fails', async () => {
    const logger = loggerMock.create();
    const ruleDataClientMock = createRuleDataClientMock();
    ruleDataClientMock.getWriter = jest
      .fn()
      .mockRejectedValueOnce(new Error('error initializing!'));
    const executor = createLifecycleExecutor(
      logger,
      ruleDataClientMock
    )<{}, TestRuleState, never, never, never>(async (options) => {
      const nextRuleState: TestRuleState = {
        aRuleStateKey: 'NEXT_RULE_STATE_VALUE',
      };

      return { state: nextRuleState };
    });

    await expect(() =>
      executor(
        createDefaultAlertExecutorOptions({
          params: {},
          state: { wrapped: initialRuleState, trackedAlerts: {}, trackedAlertsRecovered: {} },
          shouldWriteAlerts: false,
          logger,
        })
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error initializing!"`);
  });

  describe('updating flappingHistory', () => {
    it('sets flapping state to true on a new alert', async () => {
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

        return { state };
      });

      const {
        state: { trackedAlerts, trackedAlertsRecovered },
      } = await executor(
        createDefaultAlertExecutorOptions({
          params: {},
          state: { wrapped: initialRuleState, trackedAlerts: {}, trackedAlertsRecovered: {} },
          logger,
        })
      );

      const alerts = pick(trackedAlerts, [
        'TEST_ALERT_0.flappingHistory',
        'TEST_ALERT_1.flappingHistory',
      ]);
      expect(alerts).toMatchInlineSnapshot(`
        Object {
          "TEST_ALERT_0": Object {
            "flappingHistory": Array [
              true,
            ],
          },
          "TEST_ALERT_1": Object {
            "flappingHistory": Array [
              true,
            ],
          },
        }
      `);
      expect(trackedAlertsRecovered).toMatchInlineSnapshot(`Object {}`);
    });

    it('sets flapping state to false on an alert that is still active', async () => {
      const logger = loggerMock.create();
      const ruleDataClientMock = createRuleDataClientMock();
      ruleDataClientMock.getReader().search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
                [ALERT_UUID]: 'ALERT_0_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [ALERT_WORKFLOW_STATUS]: 'closed',
                [SPACE_IDS]: ['fake-space-id'],
                labels: { LABEL_0_KEY: 'LABEL_0_VALUE' }, // this must show up in the written doc
              },
            },
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
                [ALERT_UUID]: 'ALERT_1_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [ALERT_WORKFLOW_STATUS]: 'open',
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
        services.alertWithLifecycle({
          id: 'TEST_ALERT_0',
          fields: {},
        });
        services.alertWithLifecycle({
          id: 'TEST_ALERT_1',
          fields: {},
        });

        return { state };
      });

      const {
        state: { trackedAlerts, trackedAlertsRecovered },
      } = await executor(
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
                flappingHistory: [],
                flapping: false,
              },
              TEST_ALERT_1: {
                alertId: 'TEST_ALERT_1',
                alertUuid: 'TEST_ALERT_1_UUID',
                started: '2020-01-02T12:00:00.000Z',
                flappingHistory: [],
                flapping: false,
              },
            },
            trackedAlertsRecovered: {},
          },
          logger,
        })
      );

      const alerts = pick(trackedAlerts, [
        'TEST_ALERT_0.flappingHistory',
        'TEST_ALERT_1.flappingHistory',
      ]);
      expect(alerts).toMatchInlineSnapshot(`
        Object {
          "TEST_ALERT_0": Object {
            "flappingHistory": Array [
              false,
            ],
          },
          "TEST_ALERT_1": Object {
            "flappingHistory": Array [
              false,
            ],
          },
        }
      `);
      expect(trackedAlertsRecovered).toMatchInlineSnapshot(`Object {}`);
    });

    it('sets flapping state to true on an alert that is active and previously recovered', async () => {
      const logger = loggerMock.create();
      const ruleDataClientMock = createRuleDataClientMock();
      ruleDataClientMock.getReader().search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
                [ALERT_UUID]: 'ALERT_0_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [ALERT_WORKFLOW_STATUS]: 'closed',
                [SPACE_IDS]: ['fake-space-id'],
                labels: { LABEL_0_KEY: 'LABEL_0_VALUE' }, // this must show up in the written doc
              },
            },
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
                [ALERT_UUID]: 'ALERT_1_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [ALERT_WORKFLOW_STATUS]: 'open',
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
        services.alertWithLifecycle({
          id: 'TEST_ALERT_0',
          fields: {},
        });
        services.alertWithLifecycle({
          id: 'TEST_ALERT_1',
          fields: {},
        });

        return { state };
      });

      const {
        state: { trackedAlerts, trackedAlertsRecovered },
      } = await executor(
        createDefaultAlertExecutorOptions({
          alertId: 'TEST_ALERT_0',
          params: {},
          state: {
            wrapped: initialRuleState,
            trackedAlertsRecovered: {
              TEST_ALERT_0: {
                alertId: 'TEST_ALERT_0',
                alertUuid: 'TEST_ALERT_0_UUID',
                started: '2020-01-01T12:00:00.000Z',
                flappingHistory: [],
                flapping: false,
              },
              TEST_ALERT_1: {
                alertId: 'TEST_ALERT_1',
                alertUuid: 'TEST_ALERT_1_UUID',
                started: '2020-01-02T12:00:00.000Z',
                flappingHistory: [],
                flapping: false,
              },
            },
            trackedAlerts: {},
          },
          logger,
        })
      );

      const alerts = pick(trackedAlerts, [
        'TEST_ALERT_0.flappingHistory',
        'TEST_ALERT_1.flappingHistory',
      ]);
      expect(alerts).toMatchInlineSnapshot(`
        Object {
          "TEST_ALERT_0": Object {
            "flappingHistory": Array [
              true,
            ],
          },
          "TEST_ALERT_1": Object {
            "flappingHistory": Array [
              true,
            ],
          },
        }
      `);
      expect(trackedAlertsRecovered).toMatchInlineSnapshot(`Object {}`);
    });

    it('sets flapping state to true on an alert that is recovered and previously active', async () => {
      const logger = loggerMock.create();
      const ruleDataClientMock = createRuleDataClientMock();
      ruleDataClientMock.getReader().search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
                [ALERT_UUID]: 'ALERT_0_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [SPACE_IDS]: ['fake-space-id'],
                labels: { LABEL_0_KEY: 'LABEL_0_VALUE' }, // this must show up in the written doc
              },
            },
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
                [ALERT_UUID]: 'ALERT_1_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
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

        return { state };
      });

      const {
        state: { trackedAlerts, trackedAlertsRecovered },
      } = await executor(
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
                flappingHistory: [],
                flapping: false,
              },
              TEST_ALERT_1: {
                alertId: 'TEST_ALERT_1',
                alertUuid: 'TEST_ALERT_1_UUID',
                started: '2020-01-02T12:00:00.000Z',
                flappingHistory: [],
                flapping: false,
              },
            },
            trackedAlertsRecovered: {},
          },
          logger,
        })
      );

      const recovered = pick(trackedAlertsRecovered, ['TEST_ALERT_0.flappingHistory']);
      expect(recovered).toMatchInlineSnapshot(`
        Object {
          "TEST_ALERT_0": Object {
            "flappingHistory": Array [
              true,
            ],
          },
        }
      `);
      const active = pick(trackedAlerts, ['TEST_ALERT_1.flappingHistory']);
      expect(active).toMatchInlineSnapshot(`
        Object {
          "TEST_ALERT_1": Object {
            "flappingHistory": Array [
              false,
            ],
          },
        }
      `);
    });

    it('sets flapping state to false on an alert that is still recovered', async () => {
      const logger = loggerMock.create();
      const ruleDataClientMock = createRuleDataClientMock();
      ruleDataClientMock.getReader().search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
                [ALERT_UUID]: 'ALERT_0_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [SPACE_IDS]: ['fake-space-id'],
                labels: { LABEL_0_KEY: 'LABEL_0_VALUE' }, // this must show up in the written doc
              },
            },
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
                [ALERT_UUID]: 'ALERT_1_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
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

        return { state };
      });

      const {
        state: { trackedAlerts, trackedAlertsRecovered },
      } = await executor(
        createDefaultAlertExecutorOptions({
          alertId: 'TEST_ALERT_0',
          params: {},
          state: {
            wrapped: initialRuleState,
            trackedAlerts: {
              TEST_ALERT_1: {
                alertId: 'TEST_ALERT_1',
                alertUuid: 'TEST_ALERT_1_UUID',
                started: '2020-01-02T12:00:00.000Z',
                flappingHistory: [],
                flapping: false,
              },
            },
            trackedAlertsRecovered: {
              TEST_ALERT_0: {
                alertId: 'TEST_ALERT_0',
                alertUuid: 'TEST_ALERT_0_UUID',
                started: '2020-01-01T12:00:00.000Z',
                flappingHistory: [],
                flapping: false,
              },
            },
          },
          logger,
        })
      );

      const recovered = pick(trackedAlertsRecovered, ['TEST_ALERT_0.flappingHistory']);
      expect(recovered).toMatchInlineSnapshot(`Object {}`);
      const active = pick(trackedAlerts, ['TEST_ALERT_1.flappingHistory']);
      expect(active).toMatchInlineSnapshot(`
        Object {
          "TEST_ALERT_1": Object {
            "flappingHistory": Array [
              false,
            ],
          },
        }
      `);
    });
  });

  describe('set flapping on the document', () => {
    const flapping = new Array(16).fill(false).concat([true, true, true, true]);
    const notFlapping = new Array(20).fill(false);

    it('updates documents with flapping for active alerts', async () => {
      const logger = loggerMock.create();
      const ruleDataClientMock = createRuleDataClientMock();
      ruleDataClientMock.getReader().search.mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
                [ALERT_UUID]: 'ALERT_0_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [ALERT_WORKFLOW_STATUS]: 'closed',
                [SPACE_IDS]: ['fake-space-id'],
              },
            },
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
                [ALERT_UUID]: 'ALERT_1_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: ['fake-space-id'],
              },
            },
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
                [ALERT_UUID]: 'ALERT_2_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: ['fake-space-id'],
              },
            },
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
                [ALERT_UUID]: 'ALERT_3_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [ALERT_WORKFLOW_STATUS]: 'open',
                [SPACE_IDS]: ['fake-space-id'],
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
        services.alertWithLifecycle({
          id: 'TEST_ALERT_2',
          fields: {},
        });
        services.alertWithLifecycle({
          id: 'TEST_ALERT_3',
          fields: {},
        });

        return { state };
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
                flappingHistory: flapping,
                flapping: false,
              },
              TEST_ALERT_1: {
                alertId: 'TEST_ALERT_1',
                alertUuid: 'TEST_ALERT_1_UUID',
                started: '2020-01-02T12:00:00.000Z',
                flappingHistory: [false, false],
                flapping: false,
              },
              TEST_ALERT_2: {
                alertId: 'TEST_ALERT_2',
                alertUuid: 'TEST_ALERT_2_UUID',
                started: '2020-01-01T12:00:00.000Z',
                flappingHistory: flapping,
                flapping: true,
              },
              TEST_ALERT_3: {
                alertId: 'TEST_ALERT_3',
                alertUuid: 'TEST_ALERT_3_UUID',
                started: '2020-01-02T12:00:00.000Z',
                flappingHistory: [false, false],
                flapping: true,
              },
            },
            trackedAlertsRecovered: {},
          },
          logger,
        })
      );

      expect((await ruleDataClientMock.getWriter()).bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          body: [
            // alert document
            { index: { _id: 'TEST_ALERT_0_UUID' } },
            expect.objectContaining({
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
              [ALERT_WORKFLOW_STATUS]: 'closed',
              [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
              [ALERT_FLAPPING]: true,
              [EVENT_ACTION]: 'active',
              [EVENT_KIND]: 'signal',
            }),
            { index: { _id: 'TEST_ALERT_1_UUID' } },
            expect.objectContaining({
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
              [ALERT_WORKFLOW_STATUS]: 'open',
              [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
              [EVENT_ACTION]: 'active',
              [EVENT_KIND]: 'signal',
              [ALERT_FLAPPING]: false,
            }),
            { index: { _id: 'TEST_ALERT_2_UUID' } },
            expect.objectContaining({
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
              [ALERT_WORKFLOW_STATUS]: 'open',
              [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
              [EVENT_ACTION]: 'active',
              [EVENT_KIND]: 'signal',
              [ALERT_FLAPPING]: true,
            }),
            { index: { _id: 'TEST_ALERT_3_UUID' } },
            expect.objectContaining({
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
              [ALERT_WORKFLOW_STATUS]: 'open',
              [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
              [EVENT_ACTION]: 'active',
              [EVENT_KIND]: 'signal',
              [ALERT_FLAPPING]: true,
            }),
          ],
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
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
                [ALERT_UUID]: 'ALERT_0_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [SPACE_IDS]: ['fake-space-id'],
              },
            },
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
                [ALERT_UUID]: 'ALERT_1_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [SPACE_IDS]: ['fake-space-id'],
              },
            },
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
                [ALERT_UUID]: 'ALERT_2_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [SPACE_IDS]: ['fake-space-id'],
              },
            },
            {
              _source: {
                '@timestamp': '',
                [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
                [ALERT_UUID]: 'ALERT_3_UUID',
                [ALERT_RULE_CATEGORY]: 'RULE_TYPE_NAME',
                [ALERT_RULE_CONSUMER]: 'CONSUMER',
                [ALERT_RULE_NAME]: 'NAME',
                [ALERT_RULE_PRODUCER]: 'PRODUCER',
                [ALERT_RULE_TYPE_ID]: 'RULE_TYPE_ID',
                [ALERT_RULE_UUID]: 'RULE_UUID',
                [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                [SPACE_IDS]: ['fake-space-id'],
              },
            },
          ],
        },
      } as any);
      const executor = createLifecycleExecutor(
        logger,
        ruleDataClientMock
      )<{}, TestRuleState, never, never, never>(async ({ services, state }) => {
        return { state };
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
                flappingHistory: [true, true, true, true],
                flapping: false,
              },
              TEST_ALERT_1: {
                alertId: 'TEST_ALERT_1',
                alertUuid: 'TEST_ALERT_1_UUID',
                started: '2020-01-02T12:00:00.000Z',
                flappingHistory: notFlapping,
                flapping: false,
              },
              TEST_ALERT_2: {
                alertId: 'TEST_ALERT_2',
                alertUuid: 'TEST_ALERT_2_UUID',
                started: '2020-01-02T12:00:00.000Z',
                flappingHistory: [true, true],
                flapping: true,
              },
              TEST_ALERT_3: {
                alertId: 'TEST_ALERT_3',
                alertUuid: 'TEST_ALERT_3_UUID',
                started: '2020-01-02T12:00:00.000Z',
                flappingHistory: notFlapping,
                flapping: false,
              },
            },
            trackedAlertsRecovered: {},
          },
          logger,
        })
      );

      expect((await ruleDataClientMock.getWriter()).bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.arrayContaining([
            // alert document
            { index: { _id: 'TEST_ALERT_0_UUID' } },
            expect.objectContaining({
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_0',
              [ALERT_STATUS]: ALERT_STATUS_RECOVERED,
              [EVENT_ACTION]: 'close',
              [EVENT_KIND]: 'signal',
              [ALERT_FLAPPING]: true,
            }),
            { index: { _id: 'TEST_ALERT_1_UUID' } },
            expect.objectContaining({
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_1',
              [ALERT_STATUS]: ALERT_STATUS_RECOVERED,
              [EVENT_ACTION]: 'close',
              [EVENT_KIND]: 'signal',
              [ALERT_FLAPPING]: false,
            }),
            { index: { _id: 'TEST_ALERT_2_UUID' } },
            expect.objectContaining({
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_2',
              [ALERT_STATUS]: ALERT_STATUS_RECOVERED,
              [EVENT_ACTION]: 'close',
              [EVENT_KIND]: 'signal',
              [ALERT_FLAPPING]: true,
            }),
            { index: { _id: 'TEST_ALERT_3_UUID' } },
            expect.objectContaining({
              [ALERT_INSTANCE_ID]: 'TEST_ALERT_3',
              [ALERT_STATUS]: ALERT_STATUS_RECOVERED,
              [EVENT_ACTION]: 'close',
              [EVENT_KIND]: 'signal',
              [ALERT_FLAPPING]: false,
            }),
          ]),
        })
      );
    });
  });
});

type TestRuleState = Record<string, unknown> & {
  aRuleStateKey: string;
};

const initialRuleState: TestRuleState = {
  aRuleStateKey: 'INITIAL_RULE_STATE_VALUE',
};
