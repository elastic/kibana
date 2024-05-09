/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { max, memoize, omit } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { ObjectType } from '@kbn/config-schema';
import { TaskTypeDictionary } from './task_type_dictionary';
import type { TaskInstance, ConcreteTaskInstance, TaskDefinition } from './task';
import { isInterval, parseIntervalAsMillisecond } from './lib/intervals';
import { isErr, tryAsResult } from './lib/result_type';

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
  private readonly cachedGetLatestStateSchema: (taskTypeDef: TaskDefinition) => LatestStateSchema;
  private readonly cachedExtendSchema: typeof extendSchema;

  constructor({ definitions, allowReadingInvalidState, logger }: TaskValidatorOpts) {
    this.logger = logger;
    this.definitions = definitions;
    this.allowReadingInvalidState = allowReadingInvalidState;
    this.cachedGetLatestStateSchema = memoize(
      getLatestStateSchema,
      (taskTypeDef) => taskTypeDef.type
    );
    this.cachedExtendSchema = memoize(
      extendSchema,
      // We need to cache two outcomes per task type (unknowns: ignore and unknowns: forbid)
      (options) => `${options.taskType}|unknowns:${options.unknowns}`
    );
  }

  public getValidatedTaskInstanceFromReading<T extends TaskInstance>(
    task: T,
    options: { validate: boolean } = { validate: true }
  ): T {
    if (!options.validate) {
      return task;
    }

    // In the scenario the task is unused / deprecated and Kibana needs to manipulate the task,
    // we'll do a pass-through for those
    if (!this.definitions.has(task.taskType)) {
      return task;
    }

    const taskTypeDef = this.definitions.get(task.taskType);
    const latestStateSchema = this.cachedGetLatestStateSchema(taskTypeDef);

    // TODO: Remove once all task types have defined their state schema.
    // https://github.com/elastic/kibana/issues/159347
    // Otherwise, failures on read / write would occur. (don't forget to unskip test)
    if (!latestStateSchema) {
      return task;
    }

    let state = task.state;
    try {
      state = this.getValidatedStateSchema(
        this.migrateTaskState(task.state, task.stateVersion, taskTypeDef, latestStateSchema),
        task.taskType,
        latestStateSchema,
        'ignore'
      );
    } catch (e) {
      if (!this.allowReadingInvalidState) {
        throw e;
      }
      this.logger.debug(
        `[${task.taskType}][${task.id}] Failed to validate the task's state. Allowing read operation to proceed because allow_reading_invalid_state is true. Error: ${e.message}`
      );
    }

    return {
      ...task,
      state,
    };
  }

  public getValidatedTaskInstanceForUpdating<T extends TaskInstance>(
    task: T,
    options: { validate: boolean } = { validate: true }
  ): T {
    const taskWithValidatedTimeout = this.validateTimeoutOverride(task);

    if (!options.validate) {
      return taskWithValidatedTimeout;
    }

    // In the scenario the task is unused / deprecated and Kibana needs to manipulate the task,
    // we'll do a pass-through for those
    if (!this.definitions.has(taskWithValidatedTimeout.taskType)) {
      return taskWithValidatedTimeout;
    }

    const taskTypeDef = this.definitions.get(taskWithValidatedTimeout.taskType);
    const latestStateSchema = this.cachedGetLatestStateSchema(taskTypeDef);

    // TODO: Remove once all task types have defined their state schema.
    // https://github.com/elastic/kibana/issues/159347
    // Otherwise, failures on read / write would occur. (don't forget to unskip test)
    if (!latestStateSchema) {
      return taskWithValidatedTimeout;
    }

    // We are doing a write operation which must validate against the latest state schema
    return {
      ...taskWithValidatedTimeout,
      state: this.getValidatedStateSchema(
        taskWithValidatedTimeout.state,
        taskWithValidatedTimeout.taskType,
        latestStateSchema,
        'forbid'
      ),
      stateVersion: latestStateSchema?.version,
    };
  }

  public validateTimeoutOverride<T extends TaskInstance>(task: T): T {
    if (task.timeoutOverride) {
      if (
        !isInterval(task.timeoutOverride) ||
        isErr(tryAsResult(() => parseIntervalAsMillisecond(task.timeoutOverride!)))
      ) {
        this.logger.warn(
          `[TaskValidator] Invalid timeout override "${task.timeoutOverride}". Timeout must be of the form "{number}{cadence}" where number is an integer. Example: 5m. This timeout override will be ignored.`
        );

        return omit(task, 'timeoutOverride') as T;
      }
    }

    // Only allow timeoutOverride if schedule is not defined
    if (!!task.timeoutOverride && !!task.schedule) {
      this.logger.warn(
        `[TaskValidator] cannot specify timeout override ${task.timeoutOverride} when scheduling a recurring task`
      );

      return omit(task, 'timeoutOverride') as T;
    }

    return task;
  }

  private migrateTaskState(
    state: ConcreteTaskInstance['state'],
    currentVersion: number | undefined,
    taskTypeDef: TaskDefinition,
    latestStateSchema: LatestStateSchema
  ) {
    if (!latestStateSchema || (currentVersion && currentVersion >= latestStateSchema.version)) {
      return state;
    }

    let migratedState = state;
    for (let i = currentVersion || 1; i <= latestStateSchema.version; i++) {
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
    if (!latestStateSchema) {
      throw new Error(
        `[TaskValidator] stateSchemaByVersion not defined for task type: ${taskType}`
      );
    }

    return this.cachedExtendSchema({ unknowns, taskType, latestStateSchema }).validate(state);
  }
}

function extendSchema(options: {
  latestStateSchema: LatestStateSchema;
  unknowns: 'forbid' | 'ignore';
  taskType: string;
}) {
  if (!options.latestStateSchema) {
    throw new Error(
      `[TaskValidator] stateSchemaByVersion not defined for task type: ${options.taskType}`
    );
  }
  return options.latestStateSchema.schema.extendsDeep({ unknowns: options.unknowns });
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
