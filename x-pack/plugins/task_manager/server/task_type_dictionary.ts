/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskDefinition, taskDefinitionSchema, TaskRunCreatorFunction } from './task';
import { Logger } from '../../../../src/core/server';

/**
 * Types that are no longer registered and will be marked as unregistered
 */
export const REMOVED_TYPES: string[] = [
  // for testing
  'sampleTaskRemovedType',

  // deprecated in https://github.com/elastic/kibana/pull/121442
  'alerting:siem.signals',
];

/**
 * Defines a task which can be scheduled and run by the Kibana
 * task manager.
 */
export interface TaskRegisterDefinition {
  /**
   * A brief, human-friendly title for this task.
   */
  title?: string;
  /**
   * How long, in minutes or seconds, the system should wait for the task to complete
   * before it is considered to be timed out. (e.g. '5m', the default). If
   * the task takes longer than this, Kibana will send it a kill command and
   * the task will be re-attempted.
   */
  timeout?: string;
  /**
   * An optional more detailed description of what this task does.
   */
  description?: string;
  /**
   * Function that customizes how the task should behave when the task fails. This
   * function can return `true`, `false` or a Date. True will tell task manager
   * to retry using default delay logic. False will tell task manager to stop retrying
   * this task. Date will suggest when to the task manager the task should retry.
   * This function isn't used for recurring tasks, those retry as per their configured recurring schedule.
   */
  getRetry?: (attempts: number, error: object) => boolean | Date;

  /**
   * Creates an object that has a run function which performs the task's work,
   * and an optional cancel function which cancels the task.
   */
  createTaskRunner: TaskRunCreatorFunction;

  /**
   * Up to how many times the task should retry when it fails to run. This will
   * default to the global variable. The default value, if not specified, is 1.
   */
  maxAttempts?: number;
  /**
   * The maximum number tasks of this type that can be run concurrently per Kibana instance.
   * Setting this value will force Task Manager to poll for this task type separately from other task types
   * which can add significant load to the ES cluster, so please use this configuration only when absolutely necessary.
   * The default value, if not given, is 0.
   */
  maxConcurrency?: number;
}

/**
 * A mapping of task type id to the task definition.
 */
export type TaskDefinitionRegistry = Record<string, TaskRegisterDefinition>;

export class TaskTypeDictionary {
  private definitions = new Map<string, TaskDefinition>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  [Symbol.iterator]() {
    return this.definitions.entries();
  }

  public getAllTypes() {
    return [...this.definitions.keys()];
  }

  public getAllDefinitions() {
    return [...this.definitions.values()];
  }

  public has(type: string) {
    return this.definitions.has(type);
  }

  public get(type: string): TaskDefinition {
    this.ensureHas(type);
    return this.definitions.get(type)!;
  }

  public ensureHas(type: string) {
    if (!this.has(type)) {
      throw new Error(
        `Unsupported task type "${type}". Supported types are ${this.getAllTypes().join(', ')}`
      );
    }
  }

  /**
   * Method for allowing consumers to register task definitions into the system.
   * @param taskDefinitions - The Kibana task definitions dictionary
   */
  public registerTaskDefinitions(taskDefinitions: TaskDefinitionRegistry) {
    const duplicate = Object.keys(taskDefinitions).find((type) => this.definitions.has(type));
    if (duplicate) {
      throw new Error(`Task ${duplicate} is already defined!`);
    }

    const removed = Object.keys(taskDefinitions).find((type) => REMOVED_TYPES.indexOf(type) >= 0);
    if (removed) {
      throw new Error(`Task ${removed} has been removed from registration!`);
    }

    try {
      for (const definition of sanitizeTaskDefinitions(taskDefinitions)) {
        this.definitions.set(definition.type, definition);
      }
    } catch (e) {
      this.logger.error('Could not sanitize task definitions');
    }
  }
}

/**
 * Sanitizes the system's task definitions. Task definitions have optional properties, and
 * this ensures they all are given a reasonable default.
 *
 * @param taskDefinitions - The Kibana task definitions dictionary
 */
export function sanitizeTaskDefinitions(taskDefinitions: TaskDefinitionRegistry): TaskDefinition[] {
  return Object.entries(taskDefinitions).map(([type, rawDefinition]) => {
    return taskDefinitionSchema.validate({ type, ...rawDefinition }) as TaskDefinition;
  });
}
