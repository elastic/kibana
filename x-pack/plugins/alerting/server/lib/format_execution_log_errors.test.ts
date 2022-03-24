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
    const results = {
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
    expect(formatExecutionErrorsResult(results)).toEqual({
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
  test('should format results correctly with timeout', () => {
    const results = {
      page: 1,
      per_page: 500,
      total: 6,
      data: [
        {
          '@timestamp': '2022-03-24T15:34:13.199Z',
          event: {
            provider: 'alerting',
            action: 'execute-timeout',
            kind: 'alert',
            category: ['AlertingExample'],
          },
          message:
            "rule: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule' execution cancelled due to timeout - exceeded rule type timeout of 3s",
          kibana: {
            alert: {
              rule: {
                execution: {
                  uuid: 'a427f8cb-0e03-4270-90b2-ec325f4f082c',
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
            server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
            version: '8.2.0',
          },
          rule: {
            id: 'a348a740-9e2c-11ec-bd64-774ed95c43ef',
            license: 'basic',
            category: 'example.always-firing',
            ruleset: 'AlertingExample',
            name: 'test rule',
          },
          ecs: {
            version: '1.8.0',
          },
        },
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
});
