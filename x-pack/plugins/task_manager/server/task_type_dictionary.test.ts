/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { RunContext, TaskCost, TaskDefinition, TaskPriority } from './task';
import { mockLogger } from './test_utils';
import {
  sanitizeTaskDefinitions,
  TaskDefinitionRegistry,
  TaskTypeDictionary,
} from './task_type_dictionary';

jest.mock('./constants', () => ({
  CONCURRENCY_ALLOW_LIST_BY_TASK_TYPE: ['foo'],
}));

interface Opts {
  numTasks: number;
}

const getMockTaskDefinitions = (opts: Opts) => {
  const { numTasks } = opts;
  const tasks: Record<string, unknown> = {};

  for (let i = 0; i < numTasks; i++) {
    const type = `test_task_type_${i}`;
    tasks[type] = {
      type,
      title: 'Test',
      description: 'one super cool task',
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
  return tasks as unknown as Record<string, TaskDefinition>;
};

describe('taskTypeDictionary', () => {
  let definitions: TaskTypeDictionary;
  const logger = mockLogger();

  beforeEach(() => {
    jest.resetAllMocks();
    definitions = new TaskTypeDictionary(logger);
  });

  describe('sanitizeTaskDefinitions', () => {
    it('provides tasks with defaults', () => {
      const taskDefinitions = getMockTaskDefinitions({ numTasks: 3 });
      const result = sanitizeTaskDefinitions(taskDefinitions);

      expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "cost": 2,
          "createTaskRunner": [Function],
          "description": "one super cool task",
          "timeout": "5m",
          "title": "Test",
          "type": "test_task_type_0",
        },
        Object {
          "cost": 2,
          "createTaskRunner": [Function],
          "description": "one super cool task",
          "timeout": "5m",
          "title": "Test",
          "type": "test_task_type_1",
        },
        Object {
          "cost": 2,
          "createTaskRunner": [Function],
          "description": "one super cool task",
          "timeout": "5m",
          "title": "Test",
          "type": "test_task_type_2",
        },
      ]
    `);
    });

    it('throws a validation exception for invalid task definition', () => {
      const runsanitize = () => {
        const taskDefinitions: TaskDefinitionRegistry = {
          some_kind_of_task: {
            // @ts-ignore
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

        return sanitizeTaskDefinitions(taskDefinitions);
      };

      expect(runsanitize).toThrowErrorMatchingInlineSnapshot(
        `"[fail]: definition for this key is missing"`
      );
    });

    it('throws a validation exception for invalid timeout on task definition', () => {
      const runsanitize = () => {
        const taskDefinitions: TaskDefinitionRegistry = {
          some_kind_of_task: {
            title: 'Test XYZ',
            timeout: '15 days',
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

        return sanitizeTaskDefinitions(taskDefinitions);
      };

      expect(runsanitize).toThrowErrorMatchingInlineSnapshot(
        `"Invalid timeout \\"15 days\\". Timeout must be of the form \\"{number}{cadance}\\" where number is an integer. Example: 5m."`
      );
    });

    it('throws a validation exception for invalid floating point timeout on task definition', () => {
      const runsanitize = () => {
        const taskDefinitions: TaskDefinitionRegistry = {
          some_kind_of_task: {
            title: 'Test XYZ',
            timeout: '1.5h',
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

        return sanitizeTaskDefinitions(taskDefinitions);
      };

      expect(runsanitize).toThrowErrorMatchingInlineSnapshot(
        `"Invalid timeout \\"1.5h\\". Timeout must be of the form \\"{number}{cadance}\\" where number is an integer. Example: 5m."`
      );
    });

    it('throws a validation exception for invalid priority on task definition', () => {
      const runsanitize = () => {
        const taskDefinitions: TaskDefinitionRegistry = {
          some_kind_of_task: {
            title: 'Test XYZ',
            // @ts-expect-error upgrade typescript v5.1.6
            priority: 23,
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

        return sanitizeTaskDefinitions(taskDefinitions);
      };

      expect(runsanitize).toThrowErrorMatchingInlineSnapshot(
        `"Invalid priority \\"23\\". Priority must be one of Low => 1,Normal => 50"`
      );
    });
  });

  describe('registerTaskDefinitions', () => {
    it('registers a valid task', () => {
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          maxConcurrency: 2,
          createTaskRunner: jest.fn(),
        },
      });
      expect(definitions.has('foo')).toBe(true);
    });

    it('uses task priority if specified', () => {
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          maxConcurrency: 2,
          priority: TaskPriority.Low,
          createTaskRunner: jest.fn(),
        },
      });
      expect(definitions.get('foo')).toEqual({
        createTaskRunner: expect.any(Function),
        maxConcurrency: 2,
        priority: 1,
        cost: 2,
        timeout: '5m',
        title: 'foo',
        type: 'foo',
      });
    });

    it('does not register task with invalid priority schema', () => {
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          maxConcurrency: 2,
          // @ts-expect-error upgrade typescript v5.1.6
          priority: 23,
          createTaskRunner: jest.fn(),
        },
      });
      expect(logger.error).toHaveBeenCalledWith(
        `Could not sanitize task definitions: Invalid priority \"23\". Priority must be one of Low => 1,Normal => 50`
      );
      expect(definitions.get('foo')).toEqual(undefined);
    });

    it('uses task cost if specified', () => {
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          maxConcurrency: 2,
          cost: TaskCost.ExtraLarge,
          createTaskRunner: jest.fn(),
        },
      });
      expect(definitions.get('foo')).toEqual({
        createTaskRunner: expect.any(Function),
        maxConcurrency: 2,
        cost: 10,
        timeout: '5m',
        title: 'foo',
        type: 'foo',
      });
    });

    it('does not register task with invalid cost schema', () => {
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          maxConcurrency: 2,
          // @ts-expect-error upgrade typescript v5.1.6
          cost: 23,
          createTaskRunner: jest.fn(),
        },
      });
      expect(logger.error).toHaveBeenCalledWith(
        `Could not sanitize task definitions: Invalid cost \"23\". Cost must be one of Tiny => 1,Normal => 2,ExtraLarge => 10`
      );
      expect(definitions.get('foo')).toEqual(undefined);
    });

    it('throws error when registering duplicate task type', () => {
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          createTaskRunner: jest.fn(),
        },
      });

      expect(() => {
        definitions.registerTaskDefinitions({
          foo: {
            title: 'foo2',
            createTaskRunner: jest.fn(),
          },
        });
      }).toThrowErrorMatchingInlineSnapshot(`"Task foo is already defined!"`);
    });

    it('throws error when registering removed task type', () => {
      expect(() => {
        definitions.registerTaskDefinitions({
          sampleTaskRemovedType: {
            title: 'removed',
            createTaskRunner: jest.fn(),
          },
        });
      }).toThrowErrorMatchingInlineSnapshot(
        `"Task sampleTaskRemovedType has been removed from registration!"`
      );
    });

    it(`throws error when setting maxConcurrency to a task type that isn't allowed to set it`, () => {
      expect(() => {
        definitions.registerTaskDefinitions({
          foo2: {
            title: 'foo2',
            maxConcurrency: 2,
            createTaskRunner: jest.fn(),
          },
        });
      }).toThrowErrorMatchingInlineSnapshot(
        `"maxConcurrency setting isn't allowed for task type: foo2"`
      );
    });
  });
});
