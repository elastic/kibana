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
  ReportingTaskStatus,
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
    this.logger = parentLogger.clone([REPORTING_MONITOR_TYPE]);
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
    this.logger.debug(`Task to monitor for pending reports to run every ${scheduleInterval}.`);
    await taskManager.ensureScheduled({
      id: this.TYPE,
      taskType: this.TYPE,
      schedule: { interval: scheduleInterval },
      state: {},
      params: {},
    });
  }

  private getTaskRunner(): TaskRunCreatorFunction {
    return () => {
      return {
        run: async () => {
          const reportingStore = await this.getStore();

          try {
            const results = await reportingStore.findZombieReportDocuments();
            if (results && results.length) {
              this.logger.info(
                `Found ${results.length} reports to reschedule: ${results
                  .map((pending) => pending._id)
                  .join(',')}`
              );
            } else {
              this.logger.debug(`Found 0 pending reports.`);
              return;
            }

            for (const pending of results) {
              const {
                _id: jobId,
                _source: { process_expiration: processExpiration, status },
              } = pending;
              const expirationTime = moment(processExpiration); // If it is the start of the Epoch, something went wrong
              const timeWaitValue = moment().valueOf() - expirationTime.valueOf();
              const timeWaitTime = moment.duration(timeWaitValue);
              this.logger.info(
                `Task ${jobId} has ${status} status for ${timeWaitTime.humanize()}. The queue timeout is ${this.timeout.humanize()}.`
              );

              // clear process expiration and reschedule
              const oldReport = new Report({ ...pending, ...pending._source });
              const reschedulingTask = oldReport.toReportTaskJSON();
              await reportingStore.clearExpiration(oldReport);
              await this.rescheduleTask(reschedulingTask, this.logger);
            }
          } catch (err) {
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

  // reschedule the task with TM and update the report document status to "Pending"
  private async rescheduleTask(task: ReportTaskParams, logger: LevelLogger) {
    if (!this.taskManagerStart) {
      throw new Error('Reporting task runner has not been initialized!');
    }
    logger.info(`Rescheduling ${task.id} to retry after timeout expiration.`);

    const store = await this.getStore();

    const oldTaskInstance: ReportingExecuteTaskInstance = {
      taskType: REPORTING_EXECUTE_TYPE, // schedule a task to EXECUTE
      state: {},
      params: task,
    };

    const [report, newTask] = await Promise.all([
      await store.findReportFromTask(task),
      await this.taskManagerStart.schedule(oldTaskInstance),
    ]);

    await store.setReportPending(report);

    return newTask;
  }

  public getStatus() {
    if (this.taskManagerStart) {
      return ReportingTaskStatus.INITIALIZED;
    }

    return ReportingTaskStatus.UNINITIALIZED;
  }
}
