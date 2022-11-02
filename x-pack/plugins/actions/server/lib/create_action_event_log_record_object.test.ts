/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionEventLogRecordObject } from './create_action_event_log_record_object';

describe('createActionEventLogRecordObject', () => {
  test('created action event "execute-start"', async () => {
    expect(
      createActionEventLogRecordObject({
        actionId: '1',
        action: 'execute-start',
        consumer: 'test-consumer',
        timestamp: '1970-01-01T00:00:00.000Z',
        task: {
          scheduled: '1970-01-01T00:00:00.000Z',
          scheduleDelay: 0,
        },
        executionId: '123abc',
        savedObjects: [
          {
            id: '1',
            type: 'action',
            typeId: 'test',
            relation: 'primary',
          },
        ],
        spaceId: 'default',
      })
    ).toStrictEqual({
      '@timestamp': '1970-01-01T00:00:00.000Z',
      event: {
        action: 'execute-start',
        kind: 'action',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'test-consumer',
            execution: {
              uuid: '123abc',
            },
          },
        },
        saved_objects: [
          {
            id: '1',
            rel: 'primary',
            type: 'action',
            type_id: 'test',
          },
        ],
        space_ids: ['default'],
        task: {
          schedule_delay: 0,
          scheduled: '1970-01-01T00:00:00.000Z',
        },
      },
    });
  });

  test('created action event "execute"', async () => {
    expect(
      createActionEventLogRecordObject({
        actionId: '1',
        name: 'test name',
        action: 'execute',
        message: 'action execution start',
        namespace: 'default',
        executionId: '123abc',
        consumer: 'test-consumer',
        savedObjects: [
          {
            id: '2',
            type: 'action',
            typeId: '.email',
            relation: 'primary',
          },
        ],
      })
    ).toStrictEqual({
      event: {
        action: 'execute',
        kind: 'action',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'test-consumer',
            execution: {
              uuid: '123abc',
            },
          },
        },
        saved_objects: [
          {
            id: '2',
            namespace: 'default',
            rel: 'primary',
            type: 'action',
            type_id: '.email',
          },
        ],
      },
      message: 'action execution start',
    });
  });

  test('created action event "execute" with no kibana.alert.rule fields', async () => {
    expect(
      createActionEventLogRecordObject({
        actionId: '1',
        name: 'test name',
        action: 'execute',
        message: 'action execution start',
        namespace: 'default',
        savedObjects: [
          {
            id: '2',
            type: 'action',
            typeId: '.email',
            relation: 'primary',
          },
        ],
      })
    ).toStrictEqual({
      event: {
        action: 'execute',
        kind: 'action',
      },
      kibana: {
        saved_objects: [
          {
            id: '2',
            namespace: 'default',
            rel: 'primary',
            type: 'action',
            type_id: '.email',
          },
        ],
      },
      message: 'action execution start',
    });
  });

  test('created action event "execute-timeout"', async () => {
    expect(
      createActionEventLogRecordObject({
        actionId: '1',
        action: 'execute-timeout',
        task: {
          scheduled: '1970-01-01T00:00:00.000Z',
        },
        executionId: '123abc',
        savedObjects: [
          {
            id: '1',
            type: 'action',
            typeId: 'test',
            relation: 'primary',
          },
        ],
      })
    ).toStrictEqual({
      event: {
        action: 'execute-timeout',
        kind: 'action',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '123abc',
            },
          },
        },
        saved_objects: [
          {
            id: '1',
            rel: 'primary',
            type: 'action',
            type_id: 'test',
          },
        ],
        task: {
          schedule_delay: undefined,
          scheduled: '1970-01-01T00:00:00.000Z',
        },
      },
    });
  });

  test('created action event "execute" with related saved object', async () => {
    expect(
      createActionEventLogRecordObject({
        actionId: '1',
        name: 'test name',
        action: 'execute',
        message: 'action execution start',
        namespace: 'default',
        executionId: '123abc',
        consumer: 'test-consumer',
        savedObjects: [
          {
            id: '2',
            type: 'action',
            typeId: '.email',
            relation: 'primary',
          },
        ],
        relatedSavedObjects: [
          {
            type: 'alert',
            typeId: '.rule-type',
            id: '123',
          },
        ],
      })
    ).toStrictEqual({
      event: {
        action: 'execute',
        kind: 'action',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'test-consumer',
            execution: {
              uuid: '123abc',
            },
            rule_type_id: '.rule-type',
          },
        },
        saved_objects: [
          {
            id: '2',
            namespace: 'default',
            rel: 'primary',
            type: 'action',
            type_id: '.email',
          },
          {
            id: '123',
            rel: 'primary',
            type: 'alert',
            namespace: undefined,
            type_id: '.rule-type',
          },
        ],
      },
      message: 'action execution start',
    });
  });
});
