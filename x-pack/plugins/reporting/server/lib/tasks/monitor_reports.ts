/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { LevelLogger, ReportingStore } from '../';
import { ReportingCore } from '../../';
import { TaskManagerStartContract, TaskRunCreatorFunction } from '../../../../task_manager/server';
import { numberToDuration } from '../../../common/schema_utils';
import { ReportingConfigType } from '../../config';
import { Report } from '../store';
import {
  ReportingExecuteTaskInstance,
  ReportingTask,
  REPORTING_EXECUTE_TYPE,
  REPORTING_MONITOR_TYPE,
  ReportTaskParams,
} from './';

/*
 * Task for finding the ReportingRecords left in the ReportingStore and stuck
 * in pending or processing. It could happen if the server crashed while running
 * a report and was cancelled. Normally a failure would mean scheduling a
 * retry or failing the report, but the retry is not guaranteed to be scheduled.
 */
export class MonitorReportsTask implements ReportingTask {
  public TYPE = REPORTING_MONITOR_TYPE;

  private logger: LevelLogger;
  private taskManagerStart?: TaskManagerStartContract;
  private store?: ReportingStore;
  private timeout: moment.Duration;

  constructor(
    private reporting: ReportingCore,
    private config: ReportingConfigType,
    parentLogger: LevelLogger
  ) {
    this.logger = parentLogger.clone(['monitored-expired']);
    this.timeout = numberToDuration(config.queue.timeout);
  }

  private async getStore(): Promise<ReportingStore> {
    if (this.store) {
      return this.store;
    }
    const { store } = await this.reporting.getPluginStartDeps();
    this.store = store;
    return store;
  }

  public async init(taskManager: TaskManagerStartContract) {
    this.taskManagerStart = taskManager;

    // Round the interval up to the nearest second since Task Manager doesn't
    // support milliseconds
    const scheduleInterval =
      Math.ceil(numberToDuration(this.config.queue.pollInterval).asSeconds()) + 's';

    await taskManager.ensureScheduled({
      id: this.TYPE,
      taskType: this.TYPE,
      state: {},
      params: {},
      schedule: { interval: scheduleInterval },
    });
  }

  private getTaskRunner(): TaskRunCreatorFunction {
    return () => {
      return {
        run: async () => {
          const reportingStore = await this.getStore();

          try {
            this.logger.debug('Checking for expired reports...');
            const results = await reportingStore.findExpiredReports();
            if (!results || results.length < 1) {
              return;
            }

            for (const expired of results) {
              const {
                _id: jobId,
                _source: { process_expiration: processExpiration, status },
              } = expired;
              const expirationTime = moment(processExpiration);
              const timeWaitValue = moment().valueOf() - expirationTime.valueOf();
              const timeWaitTime = moment.duration(timeWaitValue);
              this.logger.info(
                `Task ${jobId} has ${status} status for ${timeWaitTime.humanize()}. The queue timeout is ${this.timeout.humanize()}.`
              );

              // clear process expiration and reschedule
              const oldReport = new Report({ ...expired, ...expired._source });
              const reschedulingTask = oldReport.toReportTaskJSON();
              await reportingStore.clearExpiration(oldReport);
              await this.rescheduleTask(reschedulingTask, this.logger);
              // TODO handle error
              // if there is an error that is not a conflict, then mark the report failed?
            }
          } catch (err) {
            this.logger.error('Could not find and update expired reports!');
            this.logger.error(err);
          }

          return;
        },

        cancel: async () => ({ state: {} }),
      };
    };
  }

  public getTaskDefinition() {
    return {
      type: REPORTING_MONITOR_TYPE,
      title: 'Reporting: monitor jobs',
      createTaskRunner: this.getTaskRunner(),
      maxAttempts: 1,
      // round the timeout value up to the nearest second, since Task Manager
      // doesn't support milliseconds
      timeout: Math.ceil(this.timeout.asSeconds()) + 's',
    };
  }

  private async rescheduleTask(task: ReportTaskParams, logger: LevelLogger) {
    if (!this.taskManagerStart) {
      throw new Error('Reporting task runner has not been initialized!');
    }

    logger.info(`Rescheduling ${task.id} to retry after timeout expiration.`);

    const oldTaskInstance: ReportingExecuteTaskInstance = {
      taskType: REPORTING_EXECUTE_TYPE, // schedule a task to EXECUTE
      state: {},
      params: task,
    };
    return await this.taskManagerStart.schedule(oldTaskInstance);
  }
}
