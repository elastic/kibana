/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import {
  SanitizedTaskDefinition,
  TaskDefinition,
  TaskDictionary,
  validateTaskDefinition,
} from '../task';

/**
 * Sanitizes the system's task definitions. Task definitions have optional properties, and
 * this ensures they all are given a reasonable default. This also overrides certain task
 * definition properties with kibana.yml overrides (such as the `override_num_workers` config
 * value).
 *
 * @param maxWorkers - The maxiumum numer of workers allowed to run at once
 * @param taskDefinitions - The Kibana task definitions dictionary
 * @param overrideNumWorkers - The kibana.yml overrides numWorkers per task type.
 */
export function sanitizeTaskDefinitions(
  taskDefinitions: TaskDictionary<TaskDefinition> = {},
  maxWorkers: number,
  overrideNumWorkers: { [taskType: string]: number }
): TaskDictionary<SanitizedTaskDefinition> {
  return Object.keys(taskDefinitions).reduce(
    (acc, type) => {
      const rawDefinition = taskDefinitions[type];
      rawDefinition.type = type;
      const definition = Joi.attempt(rawDefinition, validateTaskDefinition) as TaskDefinition;
      const numWorkers = Math.min(
        maxWorkers,
        overrideNumWorkers[definition.type] || definition.numWorkers || 1
      );

      acc[type] = {
        ...definition,
        numWorkers,
      };

      return acc;
    },
    {} as TaskDictionary<SanitizedTaskDefinition>
  );
}
