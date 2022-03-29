/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatExecutionErrorsResult } from './format_execution_log_errors';
import { QueryEventsBySavedObjectResult } from '../../../event_log/server';

describe('formatExecutionErrorsResult', () => {
  test('should return empty results if data is undefined', () => {
    expect(formatExecutionErrorsResult({} as QueryEventsBySavedObjectResult)).toEqual({
      totalErrors: 0,
      errors: [],
    });
  });
  test('should format results correctly', () => {
    const results = getEsResults({
      data: [
        {
          timestamp: '2022-03-23T17:37:07.106Z',
          provider: 'actions',
          action: 'execute',
          outcome: 'failure',
          kind: 'action',
          executionUuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: test-connector',
          errorMessage:
            'an error occurred while running the action executor: something funky with the server log',
        },
        {
          timestamp: '2022-03-23T17:37:07.102Z',
          provider: 'actions',
          action: 'execute',
          outcome: 'failure',
          kind: 'action',
          executionUuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: test-connector',
          errorMessage:
            'an error occurred while running the action executor: something funky with the server log',
        },
        {
          timestamp: '2022-03-23T17:23:05.249Z',
          provider: 'alerting',
          action: 'execute',
          outcome: 'failure',
          kind: 'alert',
          executionUuid: 'c1c04f04-312e-4e23-8e36-e01eb4332ed6',
          message: `rule execution failure: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'`,
          errorMessage: 'I am erroring in rule execution!!',
        },
      ],
    });
    expect(formatExecutionErrorsResult(results)).toEqual({
      totalErrors: 6,
      errors: [
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.106Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: test-connector - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.102Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: test-connector - an error occurred while running the action executor: something funky with the server log',
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
  test('should format results correctly with timeout', () => {
    const results = getEsResults({
      data: [
        {
          timestamp: '2022-03-24T15:34:13.199Z',
          provider: 'alerting',
          action: 'execute-timeout',
          kind: 'alert',
          executionUuid: 'a427f8cb-0e03-4270-90b2-ec325f4f082c',
          message: `rule: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule' execution cancelled due to timeout - exceeded rule type timeout of 3s`,
        },
        {
          timestamp: '2022-03-23T17:37:07.106Z',
          provider: 'actions',
          action: 'execute',
          outcome: 'failure',
          kind: 'action',
          executionUuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: test-connector',
          errorMessage:
            'an error occurred while running the action executor: something funky with the server log',
        },
        {
          timestamp: '2022-03-23T17:37:07.102Z',
          provider: 'actions',
          action: 'execute',
          outcome: 'failure',
          kind: 'action',
          executionUuid: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: test-connector',
          errorMessage:
            'an error occurred while running the action executor: something funky with the server log',
        },
        {
          timestamp: '2022-03-23T17:23:05.249Z',
          provider: 'alerting',
          action: 'execute',
          outcome: 'failure',
          kind: 'alert',
          executionUuid: 'c1c04f04-312e-4e23-8e36-e01eb4332ed6',
          message: `rule execution failure: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'`,
          errorMessage: 'I am erroring in rule execution!!',
        },
      ],
    });
    expect(formatExecutionErrorsResult(results)).toEqual({
      totalErrors: 6,
      errors: [
        {
          id: 'a427f8cb-0e03-4270-90b2-ec325f4f082c',
          timestamp: '2022-03-24T15:34:13.199Z',
          type: 'alerting',
          message:
            "rule: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule' execution cancelled due to timeout - exceeded rule type timeout of 3s",
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.106Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: test-connector - an error occurred while running the action executor: something funky with the server log',
        },
        {
          id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
          timestamp: '2022-03-23T17:37:07.102Z',
          type: 'actions',
          message:
            'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: test-connector - an error occurred while running the action executor: something funky with the server log',
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
});

interface GetEsResult {
  timestamp: string;
  provider: string;
  action: string;
  outcome?: string;
  kind: string;
  executionUuid: string;
  message: string;
  errorMessage?: string;
}
interface GetEsResultsOpts {
  page?: number;
  perPage?: number;
  total?: number;
  data: GetEsResult[];
}

function getEsResults({
  page = 1,
  perPage = 500,
  total = 6,
  data,
}: GetEsResultsOpts): QueryEventsBySavedObjectResult {
  return {
    page,
    per_page: perPage,
    total,
    data: data.map((d: GetEsResult) => ({
      '@timestamp': d.timestamp,
      event: {
        provider: d.provider,
        action: d.action,
        kind: d.kind,
        ...(d.outcome ? { outcome: d.outcome } : {}),
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: d.executionUuid,
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
          scheduled: '2022-03-23T17:37:04.674Z',
          schedule_delay: 2431000000,
        },
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
        version: '8.2.0',
      },
      message: d.message,
      ...(d.errorMessage ? { error: { message: d.errorMessage } } : {}),
      ecs: {
        version: '1.8.0',
      },
    })),
  };
}
