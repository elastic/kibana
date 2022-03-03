/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { shouldBeOneOf, mustBeAllOf } from './query_clauses';

import {
  updateFieldsAndMarkAsFailed,
  IdleTaskWithExpiredRunAt,
  RunningOrClaimingTaskWithExpiredRetryAt,
  SortByRunAtAndRetryAt,
} from './mark_available_tasks_as_claimed';

import { TaskTypeDictionary } from '../task_type_dictionary';
import { mockLogger } from '../test_utils';

let clock: sinon.SinonFakeTimers;

describe('mark_available_tasks_as_claimed', () => {
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  test('generates query matching tasks to be claimed when polling for tasks', () => {
    const definitions = new TaskTypeDictionary(mockLogger());
    definitions.registerTaskDefinitions({
      sampleTask: {
        title: 'title',
        maxAttempts: 5,
        createTaskRunner: () => ({ run: () => Promise.resolve() }),
      },
      otherTask: {
        title: 'title',
        createTaskRunner: () => ({ run: () => Promise.resolve() }),
      },
    });
    const claimTasksById = undefined;
    const defaultMaxAttempts = 1;
    const taskManagerId = '3478fg6-82374f6-83467gf5-384g6f';
    const claimOwnershipUntil = '2019-02-12T21:01:22.479Z';
    const fieldUpdates = {
      ownerId: taskManagerId,
      retryAt: claimOwnershipUntil,
    };

    expect({
      query: mustBeAllOf(
        // Either a task with idle status and runAt <= now or
        // status running or claiming with a retryAt <= now.
        shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt)
      ),
      script: updateFieldsAndMarkAsFailed({
        fieldUpdates,
        claimTasksById: claimTasksById || [],
        claimableTaskTypes: definitions.getAllTypes(),
        skippedTaskTypes: [],
        unusedTaskTypes: [],
        taskMaxAttempts: Array.from(definitions).reduce((accumulator, [type, { maxAttempts }]) => {
          return { ...accumulator, [type]: maxAttempts || defaultMaxAttempts };
        }, {}),
      }),
      sort: SortByRunAtAndRetryAt,
    }).toEqual({
      query: {
        bool: {
          must: [
            // Either a task with idle status and runAt <= now or
            // status running or claiming with a retryAt <= now.
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [
                        { term: { 'task.status': 'idle' } },
                        { range: { 'task.runAt': { lte: 'now' } } },
                      ],
                    },
                  },
                  {
                    bool: {
                      must: [
                        {
                          bool: {
                            should: [
                              { term: { 'task.status': 'running' } },
                              { term: { 'task.status': 'claiming' } },
                            ],
                          },
                        },
                        { range: { 'task.retryAt': { lte: 'now' } } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      sort: {
        _script: {
          type: 'number',
          order: 'asc',
          script: {
            lang: 'painless',
            source: `
if (doc['task.retryAt'].size()!=0) {
  return doc['task.retryAt'].value.toInstant().toEpochMilli();
}
if (doc['task.runAt'].size()!=0) {
  return doc['task.runAt'].value.toInstant().toEpochMilli();
}
    `,
          },
        },
      },
      script: {
        source: `
    if (params.claimableTaskTypes.contains(ctx._source.task.taskType)) {
      if (ctx._source.task.schedule != null || ctx._source.task.attempts < params.taskMaxAttempts[ctx._source.task.taskType] || params.claimTasksById.contains(ctx._id)) {
        if(ctx._source.task.retryAt != null && ZonedDateTime.parse(ctx._source.task.retryAt).toInstant().toEpochMilli() < params.now) {
    ctx._source.task.scheduledAt=ctx._source.task.retryAt;
  } else {
    ctx._source.task.scheduledAt=ctx._source.task.runAt;
  }
    ctx._source.task.status = "claiming"; ${Object.keys(fieldUpdates)
      .map((field) => `ctx._source.task.${field}=params.fieldUpdates.${field};`)
      .join(' ')}
      } else {
        ctx._source.task.status = "failed";
      }
    } else if (params.skippedTaskTypes.contains(ctx._source.task.taskType) && params.claimTasksById.contains(ctx._id)) {
      if(ctx._source.task.retryAt != null && ZonedDateTime.parse(ctx._source.task.retryAt).toInstant().toEpochMilli() < params.now) {
    ctx._source.task.scheduledAt=ctx._source.task.retryAt;
  } else {
    ctx._source.task.scheduledAt=ctx._source.task.runAt;
  }
    ctx._source.task.status = "claiming"; ${Object.keys(fieldUpdates)
      .map((field) => `ctx._source.task.${field}=params.fieldUpdates.${field};`)
      .join(' ')}
    } else if (params.unusedTaskTypes.contains(ctx._source.task.taskType)) {
      ctx._source.task.status = "unrecognized";
    } else {
      ctx.op = "noop";
    }`,
        lang: 'painless',
        params: {
          now: 0,
          fieldUpdates: {
            ownerId: taskManagerId,
            retryAt: claimOwnershipUntil,
          },
          claimTasksById: [],
          claimableTaskTypes: ['sampleTask', 'otherTask'],
          skippedTaskTypes: [],
          unusedTaskTypes: [],
          taskMaxAttempts: {
            sampleTask: 5,
            otherTask: 1,
          },
        },
      },
    });
  });

  describe(`script`, () => {
    test('it supports claiming specific tasks by id', async () => {
      const taskManagerId = '3478fg6-82374f6-83467gf5-384g6f';
      const claimOwnershipUntil = '2019-02-12T21:01:22.479Z';
      const fieldUpdates = {
        ownerId: taskManagerId,
        retryAt: claimOwnershipUntil,
      };

      const claimTasksById = [
        '33c6977a-ed6d-43bd-98d9-3f827f7b7cd8',
        'a208b22c-14ec-4fb4-995f-d2ff7a3b03b8',
      ];

      expect(
        updateFieldsAndMarkAsFailed({
          fieldUpdates,
          claimTasksById,
          claimableTaskTypes: ['foo', 'bar'],
          skippedTaskTypes: [],
          unusedTaskTypes: [],
          taskMaxAttempts: {
            foo: 5,
            bar: 2,
          },
        })
      ).toMatchObject({
        source: `
    if (params.claimableTaskTypes.contains(ctx._source.task.taskType)) {
      if (ctx._source.task.schedule != null || ctx._source.task.attempts < params.taskMaxAttempts[ctx._source.task.taskType] || params.claimTasksById.contains(ctx._id)) {
        if(ctx._source.task.retryAt != null && ZonedDateTime.parse(ctx._source.task.retryAt).toInstant().toEpochMilli() < params.now) {
    ctx._source.task.scheduledAt=ctx._source.task.retryAt;
  } else {
    ctx._source.task.scheduledAt=ctx._source.task.runAt;
  }
    ctx._source.task.status = "claiming"; ${Object.keys(fieldUpdates)
      .map((field) => `ctx._source.task.${field}=params.fieldUpdates.${field};`)
      .join(' ')}
      } else {
        ctx._source.task.status = "failed";
      }
    } else if (params.skippedTaskTypes.contains(ctx._source.task.taskType) && params.claimTasksById.contains(ctx._id)) {
      if(ctx._source.task.retryAt != null && ZonedDateTime.parse(ctx._source.task.retryAt).toInstant().toEpochMilli() < params.now) {
    ctx._source.task.scheduledAt=ctx._source.task.retryAt;
  } else {
    ctx._source.task.scheduledAt=ctx._source.task.runAt;
  }
    ctx._source.task.status = "claiming"; ${Object.keys(fieldUpdates)
      .map((field) => `ctx._source.task.${field}=params.fieldUpdates.${field};`)
      .join(' ')}
    } else if (params.unusedTaskTypes.contains(ctx._source.task.taskType)) {
      ctx._source.task.status = "unrecognized";
    } else {
      ctx.op = "noop";
    }`,
        lang: 'painless',
        params: {
          now: 0,
          fieldUpdates,
          claimTasksById: [
            '33c6977a-ed6d-43bd-98d9-3f827f7b7cd8',
            'a208b22c-14ec-4fb4-995f-d2ff7a3b03b8',
          ],
          claimableTaskTypes: ['foo', 'bar'],
          skippedTaskTypes: [],
          unusedTaskTypes: [],
          taskMaxAttempts: {
            foo: 5,
            bar: 2,
          },
        },
      });
    });

    test('it marks the update as a noop if the type is skipped', async () => {
      const taskManagerId = '3478fg6-82374f6-83467gf5-384g6f';
      const claimOwnershipUntil = '2019-02-12T21:01:22.479Z';
      const fieldUpdates = {
        ownerId: taskManagerId,
        retryAt: claimOwnershipUntil,
      };

      expect(
        updateFieldsAndMarkAsFailed({
          fieldUpdates,
          claimTasksById: [],
          claimableTaskTypes: ['foo', 'bar'],
          skippedTaskTypes: [],
          unusedTaskTypes: [],
          taskMaxAttempts: {
            foo: 5,
            bar: 2,
          },
        }).source
      ).toMatch(/ctx.op = "noop"/);
    });
  });
});
