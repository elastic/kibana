/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { RunContext } from '../task';
import { sanitizeTaskDefinitions } from './sanitize_task_definitions';

interface Opts {
  numTasks: number;
  numWorkers?: number;
}

const getMockTaskDefinitions = (opts: Opts) => {
  const { numTasks, numWorkers } = opts;
  const tasks: any = {};

  for (let i = 0; i < numTasks; i++) {
    const type = `test_task_type_${i}`;
    tasks[type] = {
      type,
      title: 'Test',
      description: 'one super cool task',
      numWorkers: numWorkers ? numWorkers : 1,
      createTaskRunner(context: RunContext) {
        const incre = get(context, 'taskInstance.state.incre', -1);
        return {
          run: () => ({
            state: {
              incre: incre + 1,
            },
            runAt: Date.now(),
          }),
        };
      },
    };
  }
  return tasks;
};

describe('sanitizeTaskDefinitions', () => {
  it('provides tasks with defaults if there are no overrides', () => {
    const maxWorkers = 10;
    const overrideNumWorkers = {};
    const taskDefinitions = getMockTaskDefinitions({ numTasks: 3 });
    const result = sanitizeTaskDefinitions(taskDefinitions, maxWorkers, overrideNumWorkers);

    expect(result).toMatchInlineSnapshot(`
Object {
  "test_task_type_0": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 1,
    "timeout": "5m",
    "title": "Test",
    "type": "test_task_type_0",
  },
  "test_task_type_1": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 1,
    "timeout": "5m",
    "title": "Test",
    "type": "test_task_type_1",
  },
  "test_task_type_2": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 1,
    "timeout": "5m",
    "title": "Test",
    "type": "test_task_type_2",
  },
}
`);
  });

  it('scales down task definitions workers if larger than max workers', () => {
    const maxWorkers = 2;
    const overrideNumWorkers = {};
    const taskDefinitions = getMockTaskDefinitions({ numTasks: 2, numWorkers: 5 });
    const result = sanitizeTaskDefinitions(taskDefinitions, maxWorkers, overrideNumWorkers);

    expect(result).toMatchInlineSnapshot(`
Object {
  "test_task_type_0": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 2,
    "timeout": "5m",
    "title": "Test",
    "type": "test_task_type_0",
  },
  "test_task_type_1": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 2,
    "timeout": "5m",
    "title": "Test",
    "type": "test_task_type_1",
  },
}
`);
  });

  it('incorporates overrideNumWorkers to give certain type an override of number of workers', () => {
    const overrideNumWorkers = {
      test_task_type_0: 5,
      test_task_type_1: 2,
    };
    const maxWorkers = 5;
    const taskDefinitions = getMockTaskDefinitions({ numTasks: 3 });
    const result = sanitizeTaskDefinitions(taskDefinitions, maxWorkers, overrideNumWorkers);

    expect(result).toMatchInlineSnapshot(`
Object {
  "test_task_type_0": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 5,
    "timeout": "5m",
    "title": "Test",
    "type": "test_task_type_0",
  },
  "test_task_type_1": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 2,
    "timeout": "5m",
    "title": "Test",
    "type": "test_task_type_1",
  },
  "test_task_type_2": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 1,
    "timeout": "5m",
    "title": "Test",
    "type": "test_task_type_2",
  },
}
`);
  });

  it('throws a validation exception for invalid task definition', () => {
    const runsanitize = () => {
      const maxWorkers = 10;
      const overrideNumWorkers = {};
      const taskDefinitions = {
        some_kind_of_task: {
          fail: 'extremely', // cause a validation failure
          type: 'breaky_task',
          title: 'Test XYZ',
          description: `Actually this won't work`,
          createTaskRunner() {
            return {
              async run() {
                return {
                  state: {},
                };
              },
            };
          },
        },
      };

      return sanitizeTaskDefinitions(taskDefinitions, maxWorkers, overrideNumWorkers);
    };

    expect(runsanitize).toThrowError();
  });
});
