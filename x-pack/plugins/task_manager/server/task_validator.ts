/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, max } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { ObjectType } from '@kbn/config-schema';
import { TaskTypeDictionary } from './task_type_dictionary';
import type { TaskInstance, ConcreteTaskInstance, TaskDefinition } from './task';

interface TaskValidatorOpts {
  allowReadingInvalidState: boolean;
  definitions: TaskTypeDictionary;
  logger: Logger;
}

type LatestStateSchema =
  | undefined
  | {
      schema: ObjectType;
      version: number;
      up: (state: Record<string, unknown>) => Record<string, unknown>;
    };

export class TaskValidator {
  private readonly logger: Logger;
  private readonly definitions: TaskTypeDictionary;
  private readonly allowReadingInvalidState: boolean;

  constructor({ definitions, allowReadingInvalidState, logger }: TaskValidatorOpts) {
    this.logger = logger;
    this.definitions = definitions;
    this.allowReadingInvalidState = allowReadingInvalidState;
  }

  public getValidatedTaskInstance<T extends TaskInstance>(task: T, mode: 'read' | 'write'): T {
    // In the scenario the task is unused / deprecated and Kibana needs to manipulate the task
    // we'll do a pass-through for those
    if (!this.definitions.has(task.taskType)) {
      return task;
    }

    const taskTypeDef = this.definitions.get(task.taskType);
    const lastestStateSchema = getLatestStateSchema(taskTypeDef);

    // TODO: Remove once all task types report their state schema
    if (!lastestStateSchema) {
      return task;
    }

    if (mode === 'read') {
      let state = task.state;
      try {
        state = this.getValidatedStateSchema(
          this.migrateTaskState(task.state, task.stateVersion, taskTypeDef, lastestStateSchema),
          task.taskType,
          lastestStateSchema,
          'ignore'
        );
      } catch (e) {
        if (!this.allowReadingInvalidState) {
          throw e;
        }
        this.logger.debug(
          `[${task.taskType}][${task.id}] State validation failure, but allowing to proceed given allow_reading_invalid_state is true: ${e.message}`
        );
        // TODO telemetry
      }

      return {
        ...task,
        state,
      };
    }

    return {
      ...task,
      state: this.getValidatedStateSchema(task.state, task.taskType, lastestStateSchema, 'forbid'),
      stateVersion: lastestStateSchema?.version,
    };
  }

  private migrateTaskState(
    state: ConcreteTaskInstance['state'],
    currentVersion: number | undefined,
    taskTypeDef: TaskDefinition,
    lastestStateSchema: LatestStateSchema
  ) {
    if (!lastestStateSchema || (currentVersion && currentVersion >= lastestStateSchema.version)) {
      return state;
    }

    let migratedState = state;
    for (let i = currentVersion || 1; i <= lastestStateSchema.version; i++) {
      if (!taskTypeDef.stateSchemaByVersion || !taskTypeDef.stateSchemaByVersion[`${i}`]) {
        throw new Error(
          `[TaskValidator] state schema for ${taskTypeDef.type} missing version: ${i}`
        );
      }
      migratedState = taskTypeDef.stateSchemaByVersion[i].up(migratedState);
      try {
        taskTypeDef.stateSchemaByVersion[i].schema.validate(migratedState);
      } catch (e) {
        throw new Error(
          `[TaskValidator] failed to migrate to version ${i} because the data returned from the up migration doesn't match the schema: ${e.message}`
        );
      }
    }

    return migratedState;
  }

  private getValidatedStateSchema(
    state: ConcreteTaskInstance['state'],
    taskType: string,
    latestStateSchema: LatestStateSchema,
    unknowns: 'forbid' | 'ignore'
  ): ConcreteTaskInstance['state'] {
    if (isEmpty(state)) {
      return {};
    }

    if (!latestStateSchema) {
      throw new Error(
        `[TaskValidator] stateSchemaByVersion not defined for task type: ${taskType}`
      );
    }

    return latestStateSchema.schema.extendsDeep({ unknowns }).validate(state);
  }
}

function getLatestStateSchema(taskTypeDef: TaskDefinition): LatestStateSchema {
  if (!taskTypeDef.stateSchemaByVersion) {
    return;
  }

  const versions = Object.keys(taskTypeDef.stateSchemaByVersion).map((v) => parseInt(v, 10));
  const latest = max(versions);

  if (latest === undefined) {
    return;
  }

  return {
    version: latest,
    schema: taskTypeDef.stateSchemaByVersion[latest].schema,
    up: taskTypeDef.stateSchemaByVersion[latest].up,
  };
}
