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
  constructor(private readonly logger: Logger) {}

  setup(taskManager: TaskManagerSetupContract) {
    // this.config = config;

    // Register task that will run periodic
    console.log('1111111');
    taskManager.registerTaskDefinitions({
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

    // return {
    //   session: new Session({
    //     logger: this.logger,
    //     sessionCookie: this.sessionCookie,
    //     sessionIndex: this.sessionIndex,
    //     config: this.config,
    //   }),
    // };
  }

  async scheduleScoreTask(taskManager: TaskManagerStartContract) {
    try {
      console.log('22222');
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
