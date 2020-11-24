/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { asUpdateByQuery, shouldBeOneOf, mustBeAllOf } from './query_clauses';

import {
  updateFieldsAndMarkAsFailed,
  IdleTaskWithExpiredRunAt,
  RunningOrClaimingTaskWithExpiredRetryAt,
  SortByRunAtAndRetryAt,
} from './mark_available_tasks_as_claimed';

import { TaskTypeDictionary } from '../task_type_dictionary';
import { mockLogger } from '../test_utils';

describe('mark_available_tasks_as_claimed', () => {
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

    expect(
      asUpdateByQuery({
        query: mustBeAllOf(
          // Either a task with idle status and runAt <= now or
          // status running or claiming with a retryAt <= now.
          shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt)
        ),
        update: updateFieldsAndMarkAsFailed(
          fieldUpdates,
          claimTasksById || [],
          definitions.getAllTypes(),
          Array.from(definitions).reduce((accumulator, [type, { maxAttempts }]) => {
            return { ...accumulator, [type]: maxAttempts || defaultMaxAttempts };
          }, {})
        ),
        sort: SortByRunAtAndRetryAt,
      })
    ).toEqual({
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
      seq_no_primary_term: true,
      script: {
        source: `
  if (params.registeredTaskTypes.contains(ctx._source.task.taskType)) {
    if (ctx._source.task.schedule != null || ctx._source.task.attempts < params.taskMaxAttempts[ctx._source.task.taskType] || params.claimTasksById.contains(ctx._id)) {
      ctx._source.task.status = "claiming"; ${Object.keys(fieldUpdates)
        .map((field) => `ctx._source.task.${field}=params.fieldUpdates.${field};`)
        .join(' ')}
    } else {
      ctx._source.task.status = "failed";
    }
  }
  `,
        lang: 'painless',
        params: {
          fieldUpdates: {
            ownerId: taskManagerId,
            retryAt: claimOwnershipUntil,
          },
          claimTasksById: [],
          registeredTaskTypes: ['sampleTask', 'otherTask'],
          taskMaxAttempts: {
            sampleTask: 5,
            otherTask: 1,
          },
        },
      },
    });
  });
});
