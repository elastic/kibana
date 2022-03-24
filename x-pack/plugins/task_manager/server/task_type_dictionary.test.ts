/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { RunContext, TaskDefinition } from './task';
import { mockLogger } from './test_utils';
import {
  sanitizeTaskDefinitions,
  TaskDefinitionRegistry,
  TaskTypeDictionary,
} from './task_type_dictionary';

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

  beforeEach(() => {
    definitions = new TaskTypeDictionary(mockLogger());
  });

  describe('sanitizeTaskDefinitions', () => {});
  it('provides tasks with defaults', () => {
    const taskDefinitions = getMockTaskDefinitions({ numTasks: 3 });
    const result = sanitizeTaskDefinitions(taskDefinitions);

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "createTaskRunner": [Function],
          "description": "one super cool task",
          "timeout": "5m",
          "title": "Test",
          "type": "test_task_type_0",
        },
        Object {
          "createTaskRunner": [Function],
          "description": "one super cool task",
          "timeout": "5m",
          "title": "Test",
          "type": "test_task_type_1",
        },
        Object {
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

    it('throws error when registering duplicate task type', () => {
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          maxConcurrency: 2,
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
  });
});
