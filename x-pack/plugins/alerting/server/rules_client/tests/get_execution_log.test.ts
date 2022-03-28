/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { eventLogClientMock } from '../../../../event_log/server/mocks';
import { SavedObject } from 'kibana/server';
import { RawRule } from '../../types';
import { auditLoggerMock } from '../../../../security/server/audit/mocks';
import { getBeforeSetup, mockedDateString, setGlobalDate } from './lib';
import { getExecutionLogAggregation } from '../../lib/get_execution_log_aggregation';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const eventLogClient = eventLogClientMock.create();

const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();

const kibanaVersion = 'v7.10.0';
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  minimumScheduleInterval: { value: '1m', enforce: false },
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry, eventLogClient);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

const RuleIntervalSeconds = 1;

const BaseRuleSavedObject: SavedObject<RawRule> = {
  id: '1',
  type: 'alert',
  attributes: {
    enabled: true,
    name: 'rule-name',
    tags: ['tag-1', 'tag-2'],
    alertTypeId: '123',
    consumer: 'rule-consumer',
    legacyId: null,
    schedule: { interval: `${RuleIntervalSeconds}s` },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: mockedDateString,
    updatedAt: mockedDateString,
    apiKey: null,
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: '2020-08-20T19:23:38Z',
      error: null,
      warning: null,
    },
  },
  references: [],
};

const aggregateResults = {
  aggregations: {
    executionUuid: {
      meta: {},
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '6705da7d-2635-499d-a6a8-1aee1ae1eac9',
          doc_count: 27,
          timeoutMessage: {
            meta: {},
            doc_count: 0,
          },
          alertCounts: {
            meta: {},
            buckets: {
              activeAlerts: {
                doc_count: 5,
              },
              newAlerts: {
                doc_count: 5,
              },
              recoveredAlerts: {
                doc_count: 0,
              },
            },
          },
          ruleExecution: {
            meta: {},
            doc_count: 1,
            numTriggeredActions: {
              value: 5.0,
            },
            outcomeAndMessage: {
              hits: {
                total: {
                  value: 1,
                  relation: 'eq',
                },
                max_score: 1.0,
                hits: [
                  {
                    _index: '.kibana-event-log-8.2.0-000001',
                    _id: 'S4wIZX8B8TGQpG7XQZns',
                    _score: 1.0,
                    _source: {
                      event: {
                        outcome: 'success',
                      },
                      message:
                        "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
                    },
                  },
                ],
              },
            },
            scheduleDelay: {
              value: 3.126e9,
            },
            totalSearchDuration: {
              value: 0.0,
            },
            esSearchDuration: {
              value: 0.0,
            },
            executionDuration: {
              value: 1.056e9,
            },
            executeStartTime: {
              value: 1.646667512617e12,
              value_as_string: '2022-03-07T15:38:32.617Z',
            },
          },
          actionExecution: {
            meta: {},
            doc_count: 5,
            actionOutcomes: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'success',
                  doc_count: 5,
                },
              ],
            },
          },
        },
        {
          key: '41b2755e-765a-4044-9745-b03875d5e79a',
          doc_count: 32,
          timeoutMessage: {
            meta: {},
            doc_count: 0,
          },
          alertCounts: {
            meta: {},
            buckets: {
              activeAlerts: {
                doc_count: 5,
              },
              newAlerts: {
                doc_count: 5,
              },
              recoveredAlerts: {
                doc_count: 5,
              },
            },
          },
          ruleExecution: {
            meta: {},
            doc_count: 1,
            numTriggeredActions: {
              value: 5.0,
            },
            outcomeAndMessage: {
              hits: {
                total: {
                  value: 1,
                  relation: 'eq',
                },
                max_score: 1.0,
                hits: [
                  {
                    _index: '.kibana-event-log-8.2.0-000001',
                    _id: 'a4wIZX8B8TGQpG7Xwpnz',
                    _score: 1.0,
                    _source: {
                      event: {
                        outcome: 'success',
                      },
                      message:
                        "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
                    },
                  },
                ],
              },
            },
            scheduleDelay: {
              value: 3.345e9,
            },
            totalSearchDuration: {
              value: 0.0,
            },
            esSearchDuration: {
              value: 0.0,
            },
            executionDuration: {
              value: 1.165e9,
            },
            executeStartTime: {
              value: 1.646667545604e12,
              value_as_string: '2022-03-07T15:39:05.604Z',
            },
          },
          actionExecution: {
            meta: {},
            doc_count: 5,
            actionOutcomes: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'success',
                  doc_count: 5,
                },
              ],
            },
          },
        },
      ],
    },
    executionUuidCardinality: {
      value: 374,
    },
  },
};

const findResults = {
  page: 1,
  per_page: 500,
  total: 6,
  data: [
    {
      '@timestamp': '2022-03-23T17:37:07.106Z',
      event: {
        provider: 'actions',
        action: 'execute',
        kind: 'action',
        start: '2022-03-23T17:37:07.105Z',
        end: '2022-03-23T17:37:07.105Z',
        duration: 0,
        outcome: 'failure',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'action',
            id: '9e67b8b0-9e2c-11ec-bd64-774ed95c43ef',
            type_id: '.server-log',
          },
          {
            rel: 'primary',
            type: 'alert',
            id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
            type_id: 'example.always-firing',
          },
        ],
        task: {
          scheduled: '2022-03-23T17:37:04.674Z',
          schedule_delay: 2431000000,
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '8.2.0',
      },
      message: 'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s',
      error: {
        message:
          'an error occurred while running the action executor: something funky with the server log',
      },
      ecs: {
        version: '1.8.0',
      },
    },
    {
      '@timestamp': '2022-03-23T17:37:07.102Z',
      event: {
        provider: 'actions',
        action: 'execute',
        kind: 'action',
        start: '2022-03-23T17:37:07.101Z',
        end: '2022-03-23T17:37:07.102Z',
        duration: 1000000,
        outcome: 'failure',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'action',
            id: '9e67b8b0-9e2c-11ec-bd64-774ed95c43ef',
            type_id: '.server-log',
          },
          {
            rel: 'primary',
            type: 'alert',
            id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
            type_id: 'example.always-firing',
          },
        ],
        task: {
          scheduled: '2022-03-23T17:37:04.676Z',
          schedule_delay: 2425000000,
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '8.2.0',
      },
      message: 'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s',
      error: {
        message:
          'an error occurred while running the action executor: something funky with the server log',
      },
      ecs: {
        version: '1.8.0',
      },
    },
    {
      '@timestamp': '2022-03-23T17:37:07.098Z',
      event: {
        provider: 'actions',
        action: 'execute',
        kind: 'action',
        start: '2022-03-23T17:37:07.098Z',
        end: '2022-03-23T17:37:07.098Z',
        duration: 0,
        outcome: 'failure',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'action',
            id: '9e67b8b0-9e2c-11ec-bd64-774ed95c43ef',
            type_id: '.server-log',
          },
          {
            rel: 'primary',
            type: 'alert',
            id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
            type_id: 'example.always-firing',
          },
        ],
        task: {
          scheduled: '2022-03-23T17:37:04.673Z',
          schedule_delay: 2425000000,
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '8.2.0',
      },
      message: 'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s',
      error: {
        message:
          'an error occurred while running the action executor: something funky with the server log',
      },
      ecs: {
        version: '1.8.0',
      },
    },
    {
      '@timestamp': '2022-03-23T17:37:07.096Z',
      event: {
        provider: 'actions',
        action: 'execute',
        kind: 'action',
        start: '2022-03-23T17:37:07.095Z',
        end: '2022-03-23T17:37:07.096Z',
        duration: 1000000,
        outcome: 'failure',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'action',
            id: '9e67b8b0-9e2c-11ec-bd64-774ed95c43ef',
            type_id: '.server-log',
          },
          {
            rel: 'primary',
            type: 'alert',
            id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
            type_id: 'example.always-firing',
          },
        ],
        task: {
          scheduled: '2022-03-23T17:37:04.677Z',
          schedule_delay: 2418000000,
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '8.2.0',
      },
      message: 'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s',
      error: {
        message:
          'an error occurred while running the action executor: something funky with the server log',
      },
      ecs: {
        version: '1.8.0',
      },
    },
    {
      '@timestamp': '2022-03-23T17:37:07.086Z',
      event: {
        provider: 'actions',
        action: 'execute',
        kind: 'action',
        start: '2022-03-23T17:37:07.084Z',
        end: '2022-03-23T17:37:07.086Z',
        duration: 2000000,
        outcome: 'failure',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'action',
            id: '9e67b8b0-9e2c-11ec-bd64-774ed95c43ef',
            type_id: '.server-log',
          },
          {
            rel: 'primary',
            type: 'alert',
            id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
            type_id: 'example.always-firing',
          },
        ],
        task: {
          scheduled: '2022-03-23T17:37:04.678Z',
          schedule_delay: 2406000000,
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '8.2.0',
      },
      message: 'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s',
      error: {
        message:
          'an error occurred while running the action executor: something funky with the server log',
      },
      ecs: {
        version: '1.8.0',
      },
    },
    {
      '@timestamp': '2022-03-23T17:23:05.249Z',
      event: {
        provider: 'alerting',
        action: 'execute',
        kind: 'alert',
        category: ['AlertingExample'],
        start: '2022-03-23T17:23:05.131Z',
        outcome: 'failure',
        end: '2022-03-23T17:23:05.248Z',
        duration: 117000000,
        reason: 'execute',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: 'c1c04f04-312e-4e23-8e36-e01eb4332ed6',
            },
          },
        },
        saved_objects: [
          {
            rel: 'primary',
            type: 'alert',
            id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
            type_id: 'example.always-firing',
          },
        ],
        task: {
          scheduled: '2022-03-23T17:22:23.618Z',
          schedule_delay: 41512000000,
        },
        alerting: {
          status: 'error',
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '8.2.0',
      },
      rule: {
        id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
        license: 'basic',
        category: 'example.always-firing',
        ruleset: 'AlertingExample',
      },
      message:
        "rule execution failure: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
      error: {
        message: 'I am erroring in rule execution!!',
      },
      ecs: {
        version: '1.8.0',
      },
    },
  ],
};

function getRuleSavedObject(attributes: Partial<RawRule> = {}): SavedObject<RawRule> {
  return {
    ...BaseRuleSavedObject,
    attributes: { ...BaseRuleSavedObject.attributes, ...attributes },
  };
}

function getExecutionLogByIdParams(overwrites = {}) {
  return {
    id: '1',
    dateStart: new Date(Date.now() - 3600000).toISOString(),
    page: 1,
    perPage: 10,
    sort: [{ timestamp: { order: 'desc' } }] as estypes.Sort,
    ...overwrites,
  };
}
describe('getExecutionLogForRule()', () => {
  let rulesClient: RulesClient;

  beforeEach(() => {
    rulesClient = new RulesClient(rulesClientParams);
  });

  test('runs as expected with some event log aggregation data', async () => {
    const ruleSO = getRuleSavedObject({});
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ruleSO);
    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    const result = await rulesClient.getExecutionLogForRule(getExecutionLogByIdParams());
    expect(result).toEqual({
      total: 374,
      data: [
        {
          id: '6705da7d-2635-499d-a6a8-1aee1ae1eac9',
          timestamp: '2022-03-07T15:38:32.617Z',
          duration_ms: 1056,
          status: 'success',
          message:
            "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
          num_active_alerts: 5,
          num_new_alerts: 5,
          num_recovered_alerts: 0,
          num_triggered_actions: 5,
          num_succeeded_actions: 5,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 0,
          timed_out: false,
          schedule_delay_ms: 3126,
        },
        {
          id: '41b2755e-765a-4044-9745-b03875d5e79a',
          timestamp: '2022-03-07T15:39:05.604Z',
          duration_ms: 1165,
          status: 'success',
          message:
            "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
          num_active_alerts: 5,
          num_new_alerts: 5,
          num_recovered_alerts: 5,
          num_triggered_actions: 5,
          num_succeeded_actions: 5,
          num_errored_actions: 0,
          total_search_duration_ms: 0,
          es_search_duration_ms: 0,
          timed_out: false,
          schedule_delay_ms: 3345,
        },
      ],
      totalErrors: 6,
      errors: [
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.106Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.102Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.098Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.096Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.086Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: 'c1c04f04-312e-4e23-8e36-e01eb4332ed6',
          timestamp: '2022-03-23T17:23:05.249Z',
          type: 'alerting',
          message: `rule execution failure: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule' - I am erroring in rule execution!!`,
        },
      ],
    });
  });

  // Further tests don't check the result of `getExecutionLogForRule()`, as the result
  // is just the result from the `formatExecutionLogResult()`, which itself
  // has a complete set of tests.

  test('calls saved objects and event log client with default params', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    await rulesClient.getExecutionLogForRule(getExecutionLogByIdParams());

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.aggregateEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    expect(eventLogClient.aggregateEventsBySavedObjectIds.mock.calls[0]).toEqual([
      'alert',
      ['1'],
      {
        aggs: getExecutionLogAggregation({
          page: 1,
          perPage: 10,
          sort: [{ timestamp: { order: 'desc' } }],
        }),
        end: mockedDateString,
        start: '2019-02-12T20:01:22.479Z',
      },
      undefined,
    ]);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds.mock.calls[0]).toEqual([
      'alert',
      ['1'],
      {
        per_page: 500,
        filter: `(event.action:execute AND event.outcome:failure) OR (event.action:execute-timeout)`,
        sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
        end: mockedDateString,
        start: '2019-02-12T20:01:22.479Z',
      },
      undefined,
    ]);
  });

  test('calls event log client with legacy ids param', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(
      getRuleSavedObject({ legacyId: '99999' })
    );
    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    await rulesClient.getExecutionLogForRule(getExecutionLogByIdParams());

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.aggregateEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    expect(eventLogClient.aggregateEventsBySavedObjectIds.mock.calls[0]).toEqual([
      'alert',
      ['1'],
      {
        aggs: getExecutionLogAggregation({
          page: 1,
          perPage: 10,
          sort: [{ timestamp: { order: 'desc' } }],
        }),
        end: mockedDateString,
        start: '2019-02-12T20:01:22.479Z',
      },
      ['99999'],
    ]);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds.mock.calls[0]).toEqual([
      'alert',
      ['1'],
      {
        per_page: 500,
        filter: `(event.action:execute AND event.outcome:failure) OR (event.action:execute-timeout)`,
        sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
        end: mockedDateString,
        start: '2019-02-12T20:01:22.479Z',
      },
      ['99999'],
    ]);
  });

  test('calls event log client with end date if specified', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    await rulesClient.getExecutionLogForRule(
      getExecutionLogByIdParams({ dateEnd: new Date(Date.now() - 2700000).toISOString() })
    );

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.aggregateEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    expect(eventLogClient.aggregateEventsBySavedObjectIds.mock.calls[0]).toEqual([
      'alert',
      ['1'],
      {
        aggs: getExecutionLogAggregation({
          page: 1,
          perPage: 10,
          sort: [{ timestamp: { order: 'desc' } }],
        }),
        end: '2019-02-12T20:16:22.479Z',
        start: '2019-02-12T20:01:22.479Z',
      },
      undefined,
    ]);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds.mock.calls[0]).toEqual([
      'alert',
      ['1'],
      {
        per_page: 500,
        filter: `(event.action:execute AND event.outcome:failure) OR (event.action:execute-timeout)`,
        sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
        end: '2019-02-12T20:16:22.479Z',
        start: '2019-02-12T20:01:22.479Z',
      },
      undefined,
    ]);
  });

  test('calls event log client with filter if specified', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    await rulesClient.getExecutionLogForRule(
      getExecutionLogByIdParams({ filter: 'event.outcome: success' })
    );

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.aggregateEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    expect(eventLogClient.aggregateEventsBySavedObjectIds.mock.calls[0]).toEqual([
      'alert',
      ['1'],
      {
        aggs: getExecutionLogAggregation({
          page: 1,
          perPage: 10,
          sort: [{ timestamp: { order: 'desc' } }],
        }),
        filter: 'event.outcome: success',
        end: mockedDateString,
        start: '2019-02-12T20:01:22.479Z',
      },
      undefined,
    ]);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds.mock.calls[0]).toEqual([
      'alert',
      ['1'],
      {
        per_page: 500,
        filter: `(event.action:execute AND event.outcome:failure) OR (event.action:execute-timeout)`,
        sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
        end: mockedDateString,
        start: '2019-02-12T20:01:22.479Z',
      },
      undefined,
    ]);
  });

  test('invalid start date throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    const dateStart = 'ain"t no way this will get parsed as a date';
    expect(
      rulesClient.getExecutionLogForRule(getExecutionLogByIdParams({ dateStart }))
    ).rejects.toMatchInlineSnapshot(
      `[Error: Invalid date for parameter dateStart: "ain"t no way this will get parsed as a date"]`
    );
  });

  test('invalid end date throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    const dateEnd = 'ain"t no way this will get parsed as a date';
    expect(
      rulesClient.getExecutionLogForRule(getExecutionLogByIdParams({ dateEnd }))
    ).rejects.toMatchInlineSnapshot(
      `[Error: Invalid date for parameter dateEnd: "ain"t no way this will get parsed as a date"]`
    );
  });

  test('invalid page value throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    expect(
      rulesClient.getExecutionLogForRule(getExecutionLogByIdParams({ page: -3 }))
    ).rejects.toMatchInlineSnapshot(`[Error: Invalid page field "-3" - must be greater than 0]`);
  });

  test('invalid perPage value throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    expect(
      rulesClient.getExecutionLogForRule(getExecutionLogByIdParams({ perPage: -3 }))
    ).rejects.toMatchInlineSnapshot(`[Error: Invalid perPage field "-3" - must be greater than 0]`);
  });

  test('invalid sort value throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    expect(
      rulesClient.getExecutionLogForRule(
        getExecutionLogByIdParams({ sort: [{ foo: { order: 'desc' } }] })
      )
    ).rejects.toMatchInlineSnapshot(
      `[Error: Invalid sort field "foo" - must be one of [timestamp,execution_duration,total_search_duration,es_search_duration,schedule_delay,num_triggered_actions]]`
    );
  });

  test('throws error when saved object get throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockRejectedValueOnce(new Error('OMG!'));
    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    expect(
      rulesClient.getExecutionLogForRule(getExecutionLogByIdParams())
    ).rejects.toMatchInlineSnapshot(`[Error: OMG!]`);
  });

  test('throws error when eventLog.aggregateEventsBySavedObjectIds throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.aggregateEventsBySavedObjectIds.mockRejectedValueOnce(new Error('OMG 2!'));
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);

    expect(
      rulesClient.getExecutionLogForRule(getExecutionLogByIdParams())
    ).rejects.toMatchInlineSnapshot(`[Error: OMG 2!]`);
  });

  test('throws error when eventLog.findEventsBySavedObjectIds throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
    eventLogClient.findEventsBySavedObjectIds.mockRejectedValueOnce(new Error('OMG 3!'));

    expect(
      rulesClient.getExecutionLogForRule(getExecutionLogByIdParams())
    ).rejects.toMatchInlineSnapshot(`[Error: OMG 3!]`);
  });

  describe('authorization', () => {
    beforeEach(() => {
      const ruleSO = getRuleSavedObject({});
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ruleSO);
    });

    test('ensures user is authorised to get this type of alert under the consumer', async () => {
      eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
      eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);
      await rulesClient.getExecutionLogForRule(getExecutionLogByIdParams());

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'rule-consumer',
        operation: 'get',
        ruleTypeId: '123',
      });
    });

    test('throws when user is not authorised to get this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValueOnce(
        new Error(`Unauthorized to get a "myType" alert for "myApp"`)
      );

      await expect(
        rulesClient.getExecutionLogForRule(getExecutionLogByIdParams())
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized to get a "myType" alert for "myApp"]`);

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'rule-consumer',
        operation: 'get',
        ruleTypeId: '123',
      });
    });
  });

  describe('auditLogger', () => {
    beforeEach(() => {
      const ruleSO = getRuleSavedObject({});
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ruleSO);
    });

    test('logs audit event when getting a rule execution log', async () => {
      eventLogClient.aggregateEventsBySavedObjectIds.mockResolvedValueOnce(aggregateResults);
      eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(findResults);
      await rulesClient.getExecutionLogForRule(getExecutionLogByIdParams());
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_get_execution_log',
            outcome: 'success',
          }),
          kibana: { saved_object: { id: '1', type: 'alert' } },
        })
      );
    });

    test('logs audit event when not authorised to get a rule', async () => {
      // first call occurs during rule SO get
      authorization.ensureAuthorized.mockResolvedValueOnce();
      authorization.ensureAuthorized.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(
        rulesClient.getExecutionLogForRule(getExecutionLogByIdParams())
      ).rejects.toMatchInlineSnapshot(`[Error: Unauthorized]`);
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_get_execution_log',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: '1',
              type: 'alert',
            },
          },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });
  });
});
