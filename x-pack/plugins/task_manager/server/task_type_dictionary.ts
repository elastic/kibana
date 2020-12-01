/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { TaskDefinition, validateTaskDefinition } from './task';
import { Logger } from '../../../../src/core/server';

/*
 * The TaskManager is the public interface into the task manager system. This glues together
 * all of the disparate modules in one integration point. The task manager operates in two different ways:
 *
 * - pre-init, it allows middleware registration, but disallows task manipulation
 * - post-init, it disallows middleware registration, but allows task manipulation
 *
 * Due to its complexity, this is mostly tested by integration tests (see readme).
 */

/**
 * The public interface into the task manager system.
 */
export class TaskTypeDictionary {
  private definitions = new Map<string, TaskDefinition>();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  [Symbol.iterator]() {
    return this.definitions.entries();
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
        `Unsupported task type "${type}". Supported types are ${[...this.definitions.keys()].join(
          ', '
        )}`
      );
    }
  }

  /**
   * Method for allowing consumers to register task definitions into the system.
   * @param taskDefinitions - The Kibana task definitions dictionary
   */
  public registerTaskDefinitions(taskDefinitions: Record<string, Omit<TaskDefinition, 'type'>>) {
    const duplicate = Object.keys(taskDefinitions).find((type) => this.definitions.has(type));
    if (duplicate) {
      throw new Error(`Task ${duplicate} is already defined!`);
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
export function sanitizeTaskDefinitions(
  taskDefinitions: Record<string, Omit<TaskDefinition, 'type'>>
): TaskDefinition[] {
  return Object.entries(taskDefinitions).map(([type, rawDefinition]) =>
    Joi.attempt<TaskDefinition>({ type, ...rawDefinition }, validateTaskDefinition)
  );
}
