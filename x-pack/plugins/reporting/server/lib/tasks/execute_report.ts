/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Logger } from 'kibana/server';
import moment from 'moment';
import * as Rx from 'rxjs';
import { timeout } from 'rxjs/operators';
import { finished, Writable } from 'stream';
import { promisify } from 'util';
import { getContentStream } from '../';
import type { ReportingCore } from '../../';
import type {
  RunContext,
  TaskManagerStartContract,
  TaskRunCreatorFunction,
} from '../../../../task_manager/server';
import { CancellationToken } from '../../../common/cancellation_token';
import { mapToReportingError } from '../../../common/errors/map_to_reporting_error';
import { ReportingError, QueueTimeoutError, KibanaShuttingDownError } from '../../../common/errors';
import { durationToNumber, numberToDuration } from '../../../common/schema_utils';
import type { ReportOutput } from '../../../common/types';
import type { ReportingConfigType } from '../../config';
import type { BasePayload, ExportTypeDefinition, RunTaskFn } from '../../types';
import type { ReportDocument, ReportingStore } from '../store';
import { Report, SavedReport } from '../store';
import type { ReportFailedFields, ReportProcessingFields } from '../store/store';
import {
  ReportingTask,
  ReportingTaskStatus,
  REPORTING_EXECUTE_TYPE,
  ReportTaskParams,
  TaskRunResult,
} from './';
import { errorLogger } from './error_logger';

type CompletedReportOutput = Omit<ReportOutput, 'content'>;

interface ReportingExecuteTaskInstance {
  state: object;
  taskType: string;
  params: ReportTaskParams;
  runAt?: Date;
}

interface TaskExecutor extends Pick<ExportTypeDefinition, 'jobContentEncoding'> {
  jobExecutor: RunTaskFn<BasePayload>;
}

function isOutput(output: CompletedReportOutput | Error): output is CompletedReportOutput {
  return (output as CompletedReportOutput).size != null;
}

function reportFromTask(task: ReportTaskParams) {
  return new Report({ ...task, _id: task.id, _index: task.index });
}

export class ExecuteReportTask implements ReportingTask {
  public TYPE = REPORTING_EXECUTE_TYPE;

  private logger: Logger;
  private taskManagerStart?: TaskManagerStartContract;
  private taskExecutors?: Map<string, TaskExecutor>;
  private kibanaId?: string;
  private kibanaName?: string;
  private store?: ReportingStore;

  constructor(
    private reporting: ReportingCore,
    private config: ReportingConfigType,
    logger: Logger
  ) {
    this.logger = logger.get('runTask');
  }

  /*
   * To be called from plugin start
   */
  public async init(taskManager: TaskManagerStartContract) {
    this.taskManagerStart = taskManager;

    const { reporting } = this;

    const exportTypesRegistry = reporting.getExportTypesRegistry();
    const executors = new Map<string, TaskExecutor>();
    for (const exportType of exportTypesRegistry.getAll()) {
      const exportTypeLogger = this.logger.get(exportType.jobType);
      const jobExecutor = exportType.runTaskFnFactory(reporting, exportTypeLogger);
      // The task will run the function with the job type as a param.
      // This allows us to retrieve the specific export type runFn when called to run an export
      executors.set(exportType.jobType, {
        jobExecutor,
        jobContentEncoding: exportType.jobContentEncoding,
      });
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

  private getJobContentEncoding(jobType: string) {
    return this.taskExecutors?.get(jobType)?.jobContentEncoding;
  }

  public async _claimJob(task: ReportTaskParams): Promise<SavedReport> {
    if (this.kibanaId == null) {
      throw new Error(`Kibana instance ID is undefined!`);
    }
    if (this.kibanaName == null) {
      throw new Error(`Kibana instance name is undefined!`);
    }

    const store = await this.getStore();
    const report = await store.findReportFromTask(task); // receives seq_no and primary_term

    // Check if this is a completed job. This may happen if the `reports:monitor`
    // task detected it to be a zombie job and rescheduled it, but it
    // eventually completed on its own.
    if (report.status === 'completed') {
      throw new Error(`Can not claim the report job: it is already completed!`);
    }

    const m = moment();

    // check if job has exceeded the configured maxAttempts
    const maxAttempts = this.config.capture.maxAttempts;
    if (report.attempts >= maxAttempts) {
      const err = new QueueTimeoutError(
        `Max attempts reached (${maxAttempts}). Queue timeout reached.`
      );
      await this._failJob(report, err);
      throw err;
    }

    const queueTimeout = durationToNumber(this.config.queue.timeout);
    const startTime = m.toISOString();
    const expirationTime = m.add(queueTimeout).toISOString();

    const doc: ReportProcessingFields = {
      kibana_id: this.kibanaId,
      kibana_name: this.kibanaName,
      attempts: report.attempts + 1,
      max_attempts: maxAttempts,
      started_at: startTime,
      timeout: queueTimeout,
      process_expiration: expirationTime,
    };

    const claimedReport = new SavedReport({
      ...report,
      ...doc,
    });

    this.logger.debug(
      `Claiming ${claimedReport.jobtype} ${report._id} ` +
        `[_index: ${report._index}]  ` +
        `[_seq_no: ${report._seq_no}]  ` +
        `[_primary_term: ${report._primary_term}]  ` +
        `[attempts: ${report.attempts}]  ` +
        `[process_expiration: ${expirationTime}]`
    );

    const resp = await store.setReportClaimed(claimedReport, doc);
    claimedReport._seq_no = resp._seq_no;
    claimedReport._primary_term = resp._primary_term;
    return claimedReport;
  }

  private async _failJob(
    report: SavedReport,
    error?: ReportingError
  ): Promise<UpdateResponse<ReportDocument>> {
    const message = `Failing ${report.jobtype} job ${report._id}`;

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
    const completedTime = moment().toISOString();
    const doc: ReportFailedFields = {
      completed_at: completedTime,
      output: docOutput ?? null,
    };

    return await store.setReportFailed(report, doc);
  }

  private _formatOutput(output: CompletedReportOutput | ReportingError): ReportOutput {
    const docOutput = {} as ReportOutput;
    const unknownMime = null;

    if (isOutput(output)) {
      docOutput.content_type = output.content_type || unknownMime;
      docOutput.max_size_reached = output.max_size_reached;
      docOutput.csv_contains_formulas = output.csv_contains_formulas;
      docOutput.size = output.size;
      docOutput.warnings =
        output.warnings && output.warnings.length > 0 ? output.warnings : undefined;
      docOutput.error_code = output.error_code;
    } else {
      const defaultOutput = null;
      docOutput.content = output.toString() || defaultOutput;
      docOutput.content_type = unknownMime;
      docOutput.warnings = [output.toString()];
      docOutput.error_code = output.code;
    }

    return docOutput;
  }

  public async _performJob(
    task: ReportTaskParams,
    cancellationToken: CancellationToken,
    stream: Writable
  ): Promise<TaskRunResult> {
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
    const queueTimeout = durationToNumber(this.config.queue.timeout);
    return Rx.lastValueFrom(
      Rx.from(runner.jobExecutor(task.id, task.payload, cancellationToken, stream)).pipe(
        timeout(queueTimeout)
      ) // throw an error if a value is not emitted before timeout
    );
  }

  public async _completeJob(
    report: SavedReport,
    output: CompletedReportOutput
  ): Promise<SavedReport> {
    let docId = `/${report._index}/_doc/${report._id}`;

    this.logger.debug(`Saving ${report.jobtype} to ${docId}.`);

    const completedTime = moment().toISOString();
    const docOutput = this._formatOutput(output);
    const store = await this.getStore();
    const doc = {
      completed_at: completedTime,
      metrics: output.metrics,
      output: docOutput,
    };
    docId = `/${report._index}/_doc/${report._id}`;

    const resp = await store.setReportCompleted(report, doc);
    this.logger.info(`Saved ${report.jobtype} job ${docId}`);
    report._seq_no = resp._seq_no;
    report._primary_term = resp._primary_term;
    return report;
  }

  // Generic is used to let TS infer the return type at call site.
  private async throwIfKibanaShutsDown<T>(): Promise<T> {
    await this.reporting.getKibanaShutdown$().toPromise();
    throw new KibanaShuttingDownError();
  }

  /*
   * Provides a TaskRunner for Task Manager
   */
  private getTaskRunner(): TaskRunCreatorFunction {
    // Keep a separate local stack for each task run
    return (context: RunContext) => {
      let jobId: string;
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
          let report: SavedReport | undefined;

          // find the job in the store and set status to processing
          const task = context.taskInstance.params as ReportTaskParams;
          jobId = task?.id;

          try {
            if (!jobId) {
              throw new Error('Invalid report data provided in scheduled task!');
            }
            this.reporting.trackReport(jobId);

            // Update job status to claimed
            report = await this._claimJob(task);
          } catch (failedToClaim) {
            // error claiming report - log the error
            // could be version conflict, or no longer connected to ES
            errorLogger(this.logger, `Error in claiming ${jobId}`, failedToClaim);
          }

          if (!report) {
            this.reporting.untrackReport(jobId);
            errorLogger(this.logger, `Job ${jobId} could not be claimed. Exiting...`);
            return;
          }

          const { jobtype: jobType, attempts } = report;
          const maxAttempts = this.config.capture.maxAttempts;

          this.logger.debug(
            `Starting ${jobType} report ${jobId}: attempt ${attempts} of ${maxAttempts}.`
          );
          this.logger.debug(`Reports running: ${this.reporting.countConcurrentReports()}.`);

          const eventLog = this.reporting.getEventLogger(
            new Report({ ...task, _id: task.id, _index: task.index })
          );

          try {
            const jobContentEncoding = this.getJobContentEncoding(jobType);
            const stream = await getContentStream(
              this.reporting,
              {
                id: report._id,
                index: report._index,
                if_primary_term: report._primary_term,
                if_seq_no: report._seq_no,
              },
              {
                encoding: jobContentEncoding === 'base64' ? 'base64' : 'raw',
              }
            );

            eventLog.logExecutionStart();

            const output = await Promise.race<TaskRunResult>([
              this._performJob(task, cancellationToken, stream),
              this.throwIfKibanaShutsDown(),
            ]);

            stream.end();

            await promisify(finished)(stream, { readable: false });

            report._seq_no = stream.getSeqNo()!;
            report._primary_term = stream.getPrimaryTerm()!;

            eventLog.logExecutionComplete({
              ...(output.metrics ?? {}),
              byteSize: stream.bytesWritten,
            });

            if (output) {
              this.logger.debug(`Job output size: ${stream.bytesWritten} bytes.`);
              report = await this._completeJob(report, {
                ...output,
                size: stream.bytesWritten,
              });
            }
            // untrack the report for concurrency awareness
            this.logger.debug(`Stopping ${jobId}.`);
          } catch (failedToExecuteErr) {
            eventLog.logError(failedToExecuteErr);

            cancellationToken.cancel();

            if (attempts < maxAttempts) {
              // attempts remain, reschedule
              try {
                if (report == null) {
                  throw new Error(`Report ${jobId} is null!`);
                }
                // reschedule to retry
                const remainingAttempts = maxAttempts - report.attempts;
                errorLogger(
                  this.logger,
                  `Scheduling retry for job ${jobId}. Retries remaining: ${remainingAttempts}.`,
                  failedToExecuteErr
                );

                await this.rescheduleTask(reportFromTask(task).toReportTaskJSON(), this.logger);
              } catch (rescheduleErr) {
                // can not be rescheduled - log the error
                errorLogger(
                  this.logger,
                  `Could not reschedule the errored job ${jobId}!`,
                  rescheduleErr
                );
              }
            } else {
              // 0 attempts remain - fail the job
              try {
                if (report == null) {
                  throw new Error(`Report ${jobId} is null!`);
                }
                const error = mapToReportingError(failedToExecuteErr);
                error.details =
                  error.details ||
                  `Max attempts (${attempts}) reached for job ${jobId}. Failed with: ${failedToExecuteErr.message}`;
                const resp = await this._failJob(report, error);
                report._seq_no = resp._seq_no;
                report._primary_term = resp._primary_term;
              } catch (failedToFailError) {
                errorLogger(this.logger, `Could not fail ${jobId}!`, failedToFailError);
              }
            }
          } finally {
            this.reporting.untrackReport(jobId);
            this.logger.debug(`Reports running: ${this.reporting.countConcurrentReports()}.`);
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
    const queueTimeout = Math.ceil(numberToDuration(this.config.queue.timeout).asSeconds()) + 's';
    const maxConcurrency = this.config.queue.pollEnabled ? 1 : 0;

    return {
      type: REPORTING_EXECUTE_TYPE,
      title: 'Reporting: execute job',
      createTaskRunner: this.getTaskRunner(),
      maxAttempts: 1, // NOTE: not using Task Manager retries
      timeout: queueTimeout,
      maxConcurrency,
    };
  }

  public async scheduleTask(params: ReportTaskParams) {
    const taskInstance: ReportingExecuteTaskInstance = {
      taskType: REPORTING_EXECUTE_TYPE,
      state: {},
      params,
    };

    return await this.getTaskManagerStart().schedule(taskInstance);
  }

  private async rescheduleTask(task: ReportTaskParams, logger: Logger) {
    logger.info(`Rescheduling task:${task.id} to retry after error.`);

    const oldTaskInstance: ReportingExecuteTaskInstance = {
      taskType: REPORTING_EXECUTE_TYPE,
      state: {},
      params: task,
    };
    const newTask = await this.getTaskManagerStart().schedule(oldTaskInstance);
    logger.debug(`Rescheduled task:${task.id}. New task: task:${newTask.id}`);
    return newTask;
  }

  public getStatus() {
    if (this.taskManagerStart) {
      return ReportingTaskStatus.INITIALIZED;
    }

    return ReportingTaskStatus.UNINITIALIZED;
  }
}
