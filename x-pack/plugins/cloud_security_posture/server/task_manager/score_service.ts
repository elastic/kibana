/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { RunScoreTask } from './calc_score';

const TASK_ID = 'calc_score';

export class ScoreCalculationService {
  private runScoreTask!: RunScoreTask;
  constructor(private readonly logger: Logger) {
    this.runScoreTask = new RunScoreTask(logger);
  }

  setup(taskManager: TaskManagerSetupContract) {
    // Register task that will run periodic
    const foo = taskManager.registerTaskDefinitions({
      [TASK_ID]: {
        title: 'Aggregate Latest Findings Index',
        createTaskRunner: () => ({
          run: () => this.runScoreTask.aggregateLatestFindings(),
        }),
      },
    });
  }

  async start(esClient: ElasticsearchClient, taskManager: TaskManagerStartContract) {
    new RunScoreTask(this.logger, esClient);
    await this.scheduleScoreTask(taskManager);
  }

  async scheduleScoreTask(taskManager: TaskManagerStartContract) {
    try {
      await taskManager.ensureScheduled({
        id: TASK_ID,
        taskType: TASK_ID,
        scope: ['security'],
        schedule: { interval: '1m' },
        params: {},
        state: {},
      });
    } catch (err) {
      this.logger.error(`Failed to schedule session index cleanup task: ${err.message}`);
      throw err;
    }
  }
}
