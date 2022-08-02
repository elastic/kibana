/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, CoreStart } from '@kbn/core/server';
import { RunContext, asInterval } from '@kbn/task-manager-plugin/server';
import { ActionsConfig } from '../config';
import { ActionsPluginsStart } from '../plugin';
import { ActionTypeRegistryContract } from '../types';
import { findAndCleanupTasks } from './find_and_cleanup_tasks';

export interface TaskRunnerOpts {
  logger: Logger;
  actionTypeRegistry: ActionTypeRegistryContract;
  coreStartServices: Promise<[CoreStart, ActionsPluginsStart, unknown]>;
  config: ActionsConfig['cleanupFailedExecutionsTask'];
  kibanaIndex: string;
  taskManagerIndex: string;
}

export function taskRunner(opts: TaskRunnerOpts) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        const cleanupResult = await findAndCleanupTasks(opts);
        return {
          state: {
            runs: state.runs + 1,
            total_cleaned_up: state.total_cleaned_up + cleanupResult.successCount,
          },
          schedule: {
            interval:
              cleanupResult.remaining > 0
                ? asInterval(opts.config.cleanupInterval.asMilliseconds())
                : asInterval(opts.config.idleInterval.asMilliseconds()),
          },
        };
      },
    };
  };
}
