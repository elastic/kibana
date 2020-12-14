/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import * as Rx from 'rxjs';
import { timeout } from 'rxjs/operators';
import { LevelLogger } from '../';
import { ReportingConfig, ReportingCore } from '../../';
import {
  RunContext,
  TaskManagerStartContract,
  TaskRunCreatorFunction,
} from '../../../../task_manager/server';
import { CancellationToken } from '../../../common';
import { durationToNumber, numberToDuration } from '../../../common/schema_utils';
import { BasePayload, RunTaskFn } from '../../types';
import { Report, ReportingStore } from '../store';
import {
  ReportingExecuteTaskInstance,
  ReportingTask,
  REPORTING_EXECUTE_TYPE,
  ReportTaskParams,
  TaskRunResult,
} from './';
import { errorLogger } from './error_logger';

function isOutput(output: TaskRunResult | Error): output is TaskRunResult {
  return typeof output === 'object' && (output as TaskRunResult).content != null;
}

function reportFromTask(task: ReportTaskParams) {
  return new Report({ ...task, _id: task.id, _index: task.index });
}

export class ExecuteReportTask implements ReportingTask {
  public TYPE = REPORTING_EXECUTE_TYPE;

  private logger: LevelLogger;
  private taskManagerStart?: TaskManagerStartContract;
  private taskExecutors?: Map<string, RunTaskFn<BasePayload>>;
  private kibanaId?: string;
  private kibanaName?: string;
  private store?: ReportingStore;

  constructor(
    private reporting: ReportingCore,
    private config: ReportingConfig,
    logger: LevelLogger
  ) {
    this.logger = logger.clone(['task-run']);
  }

  /*
   * To be called from plugin start
   */
  public async init(taskManager: TaskManagerStartContract) {
    this.taskManagerStart = taskManager;

    const { reporting } = this;

    const exportTypesRegistry = reporting.getExportTypesRegistry();
    const executors = new Map<string, RunTaskFn<BasePayload>>();
    for (const exportType of exportTypesRegistry.getAll()) {
      const jobExecutor = exportType.runTaskFnFactory(
        reporting,
        this.logger.clone([exportType.id])
      );
      // The task will run the function with the job type as a param.
      // This allows us to retrieve the specific export type runFn when called to run an export
      executors.set(exportType.jobType, jobExecutor);
    }

    this.taskExecutors = executors;

    const config = reporting.getConfig();
    this.kibanaId = config.kbnConfig.get('server', 'uuid');
    this.kibanaName = config.kbnConfig.get('server', 'name');
  }

  /*
   * Async get the ReportingStore: it is only available after PluginStart
   */
  private async getStore(): Promise<ReportingStore> {
    if (this.store) {
      return this.store;
    }
    const { store } = await this.reporting.getPluginStartDeps();
    this.store = store;
    return store;
  }

  private getTaskManagerStart() {
    if (!this.taskManagerStart) {
      throw new Error('Reporting task runner has not been initialized!');
    }
    return this.taskManagerStart;
  }

  public async _claimJob(task: ReportTaskParams): Promise<Report> {
    const store = await this.getStore();

    let report: Report;
    if (task.id && task.index) {
      // if this is an ad-hoc report, there is a corresponding "pending" record in ReportingStore in need of updating
      report = await store.findReportFromTask(task); // update seq_no
    } else {
      // if this is a scheduled report, the report object needs to be instantiated
      throw new Error('scheduled reports are not supported!');
    }

    const m = moment();

    // check if job has exceeded maxAttempts and somehow hasn't been marked as failed yet
    const maxAttempts = this.config.get('capture', 'maxAttempts');
    if (report.attempts >= maxAttempts) {
      const err = new Error(`Max attempts reached (${maxAttempts}). Queue timeout reached.`);
      await this._failJob(task, err);
      throw err;
    }

    const queueTimeout = durationToNumber(this.config.get('queue', 'timeout'));
    const startTime = m.toISOString();
    const expirationTime = m.add(queueTimeout).toISOString();

    const stats = {
      kibana_id: this.kibanaId,
      kibana_name: this.kibanaName,
      browser_type: this.config.get('capture', 'browser', 'type'),
      attempts: report.attempts + 1,
      started_at: startTime,
      timeout: queueTimeout,
      process_expiration: expirationTime,
    };

    this.logger.debug(`Claiming ${report.jobtype} job ${report._id}`);

    const claimedReport = new Report({
      ...report,
      ...stats,
    });
    await store.setReportClaimed(claimedReport, stats);

    return claimedReport;
  }

  private async _failJob(task: ReportTaskParams, error?: Error) {
    const message = `Failing ${task.jobtype} job ${task.id}`;

    // log the error
    let docOutput;
    if (error) {
      errorLogger(this.logger, message, error);
      docOutput = this._formatOutput(error);
    } else {
      errorLogger(this.logger, message);
    }

    // update the report in the store
    const store = await this.getStore();
    const report = await store.findReportFromTask(task);
    const completedTime = moment().toISOString();
    const doc = {
      completed_at: completedTime,
      output: docOutput,
    };

    return await store.setReportFailed(report, doc);
  }

  private _formatOutput(output: TaskRunResult | Error) {
    const docOutput = {} as TaskRunResult;
    const unknownMime = null;

    if (isOutput(output)) {
      docOutput.content = output.content;
      docOutput.content_type = output.content_type || unknownMime;
      docOutput.max_size_reached = output.max_size_reached;
      docOutput.csv_contains_formulas = output.csv_contains_formulas;
      docOutput.size = output.size;
      docOutput.warnings =
        output.warnings && output.warnings.length > 0 ? output.warnings : undefined;
    } else {
      const defaultOutput = null;
      docOutput.content = output.toString() || defaultOutput;
      docOutput.content_type = unknownMime;
      docOutput.warnings = [output.toString()];
    }

    return docOutput;
  }

  public async _performJob(task: ReportTaskParams, cancellationToken: CancellationToken) {
    if (!this.taskExecutors) {
      throw new Error(`Task run function factories have not been called yet!`);
    }

    // get the run_task function
    const runner = this.taskExecutors.get(task.jobtype);
    if (!runner) {
      throw new Error(`No defined task runner function for ${task.jobtype}!`);
    }

    // run the report
    // if workerFn doesn't finish before timeout, call the cancellationToken and throw an error
    const queueTimeout = durationToNumber(this.config.get('queue', 'timeout'));
    return Rx.from(runner(task.id, task.payload, cancellationToken))
      .pipe(timeout(queueTimeout)) // throw an error if a value is not emitted before timeout
      .toPromise();
  }

  public async _completeJob(task: ReportTaskParams, output: TaskRunResult) {
    let docId = `/${task.index}/_doc/${task.id}`;

    this.logger.info(`Saving ${task.jobtype} job ${docId}.`);

    const completedTime = moment().toISOString();
    const docOutput = this._formatOutput(output);

    const store = await this.getStore();
    const doc = {
      completed_at: completedTime,
      output: docOutput,
    };
    const report = await store.findReportFromTask(task); // update seq_no and primary_term
    docId = `/${report._index}/_doc/${report._id}`;

    try {
      await store.setReportCompleted(report, doc);
      this.logger.info(`Saved ${report.jobtype} job ${docId}`);
    } catch (err) {
      if (err.statusCode === 409) return false;
      errorLogger(this.logger, `Failure saving completed job ${docId}!`);
    }
  }

  /*
   * Provides a TaskRunner for Task Manager
   */
  private getTaskRunner(): TaskRunCreatorFunction {
    // Keep a separate local stack for each task run
    return (context: RunContext) => {
      let jobId: string | undefined;
      const cancellationToken = new CancellationToken();

      return {
        /*
         * Runs a reporting job
         * Claim job: Finds the report in ReportingStore, updates it to "processing"
         * Perform job: Gets the export type's runner, runs it with the job params
         * Complete job: Updates the report in ReportStore with the output from the runner
         * If any error happens, additional retry attempts may be picked up by a separate instance
         */
        run: async () => {
          let report: Report | undefined;
          let attempts = 0;

          // find the job in the store and set status to processing
          const task = context.taskInstance.params as ReportTaskParams;
          jobId = task?.id;

          try {
            if (!jobId) {
              throw new Error('Invalid report data provided in scheduled task!');
            }

            this.reporting.trackReport(jobId);
            this.logger.info(`Starting ${task.jobtype} report ${jobId}.`);
            this.logger.debug(`Reports running: ${this.reporting.countConcurrentReports()}.`);

            // Update job status to claimed
            report = await this._claimJob(task);
          } catch (failedToClaim) {
            // error claiming report - log the error
            // could be version conflict, or no longer connected to ES
            errorLogger(this.logger, `Error in claiming report!`, failedToClaim);
          }

          if (!report) {
            errorLogger(this.logger, `Report could not be claimed. Exiting...`);
            return;
          }

          attempts = report.attempts;

          try {
            const output = await this._performJob(task, cancellationToken);
            if (output) {
              await this._completeJob(task, output);
            }

            // untrack the report for concurrency awareness
            this.logger.info(`Stopping ${jobId}.`);
            this.reporting.untrackReport(jobId);
            this.logger.debug(`Reports running: ${this.reporting.countConcurrentReports()}.`);
          } catch (failedToExecuteErr) {
            cancellationToken.cancel();

            const maxAttempts = this.config.get('capture', 'maxAttempts');
            if (attempts < maxAttempts) {
              // attempts remain - reschedule
              try {
                // reschedule to retry
                const remainingAttempts = maxAttempts - report.attempts;
                errorLogger(
                  this.logger,
                  `Scheduling retry. Retries remaining: ${remainingAttempts}.`,
                  failedToExecuteErr
                );

                await this.rescheduleTask(reportFromTask(task).toReportTaskJSON(), this.logger);
              } catch (rescheduleErr) {
                // can not be rescheduled - log the error
                errorLogger(this.logger, `Could not reschedule the errored job!`, rescheduleErr);
              }
            } else {
              // 0 attempts remain - fail the job
              try {
                const maxAttemptsMsg = `Max attempts reached (${attempts}). Failed with: ${failedToExecuteErr}`;
                await this._failJob(task, new Error(maxAttemptsMsg));
              } catch (failedToFailError) {
                errorLogger(this.logger, `Could not fail the job!`, failedToFailError);
              }
            }
          }
        },

        /*
         * Called by Task Manager to stop the report execution process in case
         * of timeout or server shutdown
         */
        cancel: async () => {
          if (jobId) {
            this.logger.warn(`Cancelling job ${jobId}...`);
          }
          cancellationToken.cancel();
        },
      };
    };
  }

  public getTaskDefinition() {
    // round up from ms to the nearest second
    const queueTimeout =
      Math.ceil(numberToDuration(this.config.get('queue', 'timeout')).asSeconds()) + 's';

    return {
      type: REPORTING_EXECUTE_TYPE,
      title: 'Reporting: Execute reporting jobs',
      createTaskRunner: this.getTaskRunner(),
      maxAttempts: 1, // NOTE: not using Task Manager retries
      timeout: queueTimeout,
    };
  }

  public async scheduleTask(report: ReportTaskParams) {
    const taskInstance: ReportingExecuteTaskInstance = {
      taskType: REPORTING_EXECUTE_TYPE,
      state: {},
      params: report,
    };
    return await this.getTaskManagerStart().schedule(taskInstance);
  }

  private async rescheduleTask(task: ReportTaskParams, logger: LevelLogger) {
    logger.info(`Rescheduling ${task.id} to retry after error.`);

    const oldTaskInstance: ReportingExecuteTaskInstance = {
      taskType: REPORTING_EXECUTE_TYPE,
      state: {},
      params: task,
    };
    return await this.getTaskManagerStart().schedule(oldTaskInstance);
  }
}
