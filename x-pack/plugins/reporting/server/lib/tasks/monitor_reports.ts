/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'kibana/server';
import moment from 'moment';
import { ReportingStore } from '../';
import { ReportingCore } from '../../';
import { TaskManagerStartContract, TaskRunCreatorFunction } from '../../../../task_manager/server';
import { numberToDuration } from '../../../common/schema_utils';
import { ReportingConfigType } from '../../config';
import { statuses } from '../statuses';
import { SavedReport } from '../store';
import { ReportingTask, ReportingTaskStatus, REPORTING_MONITOR_TYPE, ReportTaskParams } from './';

/*
 * Task for finding the ReportingRecords left in the ReportingStore (.reporting index) and stuck in
 * a pending or processing status.
 *
 *  Stuck in pending:
 *    - This can happen if the report was scheduled in an earlier version of Kibana that used ESQueue.
 *    - Task Manager doesn't know about these types of reports because there was never a task
 *      scheduled for them.
 *  Stuck in processing:
 *    - This can could happen if the server crashed while a report was executing.
 *    - Task Manager doesn't know about these reports, because the task is completed in Task
 *      Manager when Reporting starts executing the report. We are not using Task Manager's retry
 *      mechanisms, which defer the retry for a few minutes.
 *
 * These events require us to reschedule the report with Task Manager, so that the jobs can be
 * distributed and executed.
 *
 * The runner function reschedules a single report job per task run, to avoid flooding Task Manager
 * in case many report jobs need to be recovered.
 */
export class MonitorReportsTask implements ReportingTask {
  public TYPE = REPORTING_MONITOR_TYPE;

  private logger: Logger;
  private taskManagerStart?: TaskManagerStartContract;
  private store?: ReportingStore;
  private timeout: moment.Duration;

  constructor(
    private reporting: ReportingCore,
    private config: ReportingConfigType,
    parentLogger: Logger
  ) {
    this.logger = parentLogger.get(REPORTING_MONITOR_TYPE);
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
            const recoveredJob = await reportingStore.findStaleReportJob();
            if (!recoveredJob) {
              // no reports need to be rescheduled
              return;
            }

            const report = new SavedReport({ ...recoveredJob, ...recoveredJob._source });
            const { _id: jobId, process_expiration: processExpiration, status } = report;
            const eventLog = this.reporting.getEventLogger(report);

            if (![statuses.JOB_STATUS_PENDING, statuses.JOB_STATUS_PROCESSING].includes(status)) {
              const invalidStatusError = new Error(
                `Invalid job status in the monitoring search result: ${status}`
              ); // only pending or processing jobs possibility need rescheduling
              this.logger.error(invalidStatusError);
              eventLog.logError(invalidStatusError);

              // fatal: can not reschedule the job
              throw invalidStatusError;
            }

            if (status === statuses.JOB_STATUS_PENDING) {
              const migratingJobError = new Error(
                `${jobId} was scheduled in a previous version and left in [${status}] status. Rescheduling...`
              );
              this.logger.error(migratingJobError);
              eventLog.logError(migratingJobError);
            }

            if (status === statuses.JOB_STATUS_PROCESSING) {
              const expirationTime = moment(processExpiration);
              const overdueValue = moment().valueOf() - expirationTime.valueOf();
              const overdueExpirationError = new Error(
                `${jobId} status is [${status}] and the expiration time was [${overdueValue}ms] ago. Rescheduling...`
              );
              this.logger.error(overdueExpirationError);
              eventLog.logError(overdueExpirationError);
            }

            eventLog.logRetry();

            // clear process expiration and set status to pending
            await reportingStore.prepareReportForRetry(report); // if there is a version conflict response, this just throws and logs an error

            // clear process expiration and reschedule
            await this.rescheduleTask(report.toReportTaskJSON(), this.logger); // a recovered report job must be scheduled by only a sinle Kibana instance
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
      // doesn't support milliseconds or > 1s
      timeout: Math.ceil(this.timeout.asSeconds()) + 's',
    };
  }

  // reschedule the task with TM
  private async rescheduleTask(task: ReportTaskParams, logger: Logger) {
    if (!this.taskManagerStart) {
      throw new Error('Reporting task runner has not been initialized!');
    }
    logger.info(`Rescheduling task:${task.id} to retry.`);

    const newTask = await this.reporting.scheduleTask(task);

    return newTask;
  }

  public getStatus() {
    if (this.taskManagerStart) {
      return ReportingTaskStatus.INITIALIZED;
    }

    return ReportingTaskStatus.UNINITIALIZED;
  }
}
