/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { TaskTypeDictionary } from './task_type_dictionary';
import type { TaskInstance, ConcreteTaskInstance, TaskDefinition } from './task';

interface TaskValidatorOpts {
  validateState: boolean;
  definitions: TaskTypeDictionary;
}

export class TaskValidator {
  private readonly definitions: TaskTypeDictionary;
  private readonly validateState: boolean;

  constructor({ definitions, validateState }: TaskValidatorOpts) {
    this.definitions = definitions;
    this.validateState = validateState;
  }

  public getValidatedTaskInstance<T extends TaskInstance>(task: T, mode: 'read' | 'write'): T {
    // In the scenario the task is unused / deprecated and Kibana needs to manipulate the task
    // we'll do a pass-through for those
    if (!this.definitions.has(task.taskType)) {
      return task;
    }

    const taskTypeDef = this.definitions.get(task.taskType);
    const lastestStateSchema = taskTypeDef.getLatestStateSchema();

    if (mode === 'read') {
      return {
        ...task,
        state: this.validateState
          ? getValidatedStateSchema(
              migrateTaskState(task.state, task.stateVersion, taskTypeDef, lastestStateSchema),
              task.taskType,
              lastestStateSchema,
              'ignore'
            )
          : task.state,
      };
    }

    return {
      ...task,
      state: this.validateState
        ? getValidatedStateSchema(task.state, task.taskType, lastestStateSchema, 'forbid')
        : task.state,
      stateVersion: lastestStateSchema?.version,
    };
  }
}

export function migrateTaskState(
  state: ConcreteTaskInstance['state'],
  currentVersion: number | undefined,
  taskTypeDef: TaskDefinition,
  lastestStateSchema: ReturnType<TaskDefinition['getLatestStateSchema']>
) {
  if (!lastestStateSchema || (currentVersion && currentVersion >= lastestStateSchema.version)) {
    return state;
  }

  let migratedState = state;
  for (let i = currentVersion || 1; i <= lastestStateSchema.version; i++) {
    if (!taskTypeDef.stateSchemaByVersion || !taskTypeDef.stateSchemaByVersion[`${i}`]) {
      throw new Error(
        `[migrateStateSchema] state schema for ${taskTypeDef.type} missing version: ${i}`
      );
    }
    migratedState = taskTypeDef.stateSchemaByVersion[i].up(migratedState);
    try {
      taskTypeDef.stateSchemaByVersion[i].schema.validate(migratedState);
    } catch (e) {
      throw new Error(
        `[migrateStateSchema] failed to migrate to version ${i} because the data returned from the up migration doesn't match the schema: ${e.message}`
      );
    }
  }

  return migratedState;
}

export function getValidatedStateSchema(
  state: ConcreteTaskInstance['state'],
  taskType: string,
  latestStateSchema: ReturnType<TaskDefinition['getLatestStateSchema']>,
  unknowns: 'forbid' | 'ignore'
): ConcreteTaskInstance['state'] {
  if (isEmpty(state)) {
    return {};
  }

  if (!latestStateSchema) {
    throw new Error(
      `[validateStateSchema] stateSchemaByVersion not defined for task type: ${taskType}`
    );
  }

  return latestStateSchema.schema.extendsDeep({ unknowns }).validate(state);
}
