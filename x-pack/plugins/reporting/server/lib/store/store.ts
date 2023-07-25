/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import moment from 'moment';
import type { IReport, Report, ReportDocument } from '.';
import { SavedReport } from '.';
import { statuses } from '..';
import type { ReportingCore } from '../..';
import {
  ILM_POLICY_NAME,
  REPORTING_DATA_STREAM,
  REPORTING_DATA_STREAM_WILDCARD,
} from '../../../common/constants';
import type { JobStatus, ReportOutput, ReportSource } from '../../../common/types';
import type { ReportTaskParams } from '../tasks';
import { IlmPolicyManager } from './ilm_policy_manager';
import { MIGRATION_VERSION } from './report';

type UpdateResponse<T> = estypes.UpdateResponse<T>;
type IndexResponse = estypes.IndexResponse;

/*
 * When an instance of Kibana claims a report job, this information tells us about that instance
 */
export type ReportProcessingFields = Required<{
  kibana_id: Report['kibana_id'];
  kibana_name: Report['kibana_name'];
  attempts: Report['attempts'];
  started_at: Report['started_at'];
  max_attempts: Report['max_attempts'];
  timeout: Report['timeout'];
  process_expiration: Report['process_expiration'];
}>;

export type ReportFailedFields = Required<{
  completed_at: Report['completed_at'];
  output: ReportOutput | null;
}>;

export type ReportCompletedFields = Required<{
  completed_at: Report['completed_at'];
  output: Omit<ReportOutput, 'content'> | null;
}>;

/*
 * When searching for long-pending reports, we get a subset of fields
 */
export interface ReportRecordTimeout {
  _id: string;
  _index: string;
  _source: {
    status: JobStatus;
    process_expiration?: string;
  };
}

/*
 * When searching for long-pending reports, we get a subset of fields
 */
const sourceDoc = (doc: Partial<ReportSource>): Partial<ReportSource> => {
  return {
    ...doc,
    migration_version: MIGRATION_VERSION,
    '@timestamp': new Date(0).toISOString(), // required for data streams compatibility
  };
};

const jobDebugMessage = (report: Report) =>
  `${report._id} ` +
  `[_index: ${report._index}] ` +
  `[_seq_no: ${report._seq_no}]  ` +
  `[_primary_term: ${report._primary_term}]` +
  `[attempts: ${report.attempts}] ` +
  `[process_expiration: ${report.process_expiration}]`;

/*
 * A class to give an interface to historical reports in the reporting.index
 * - track the state: pending, processing, completed, etc
 * - handle updates and deletes to the reporting document
 * - interface for downloading the report
 */
export class ReportingStore {
  private client?: ElasticsearchClient;

  constructor(private reportingCore: ReportingCore, private logger: Logger) {
    this.logger = logger.get('store');
  }

  private async getClient() {
    if (!this.client) {
      ({ asInternalUser: this.client } = await this.reportingCore.getEsClient());
    }

    return this.client;
  }

  private async createIlmPolicy() {
    const client = await this.getClient();
    const ilmPolicyManager = IlmPolicyManager.create({ client });
    if (await ilmPolicyManager.doesIlmPolicyExist()) {
      this.logger.debug(`Found ILM policy ${ILM_POLICY_NAME}; skipping creation.`);
      return;
    }
    this.logger.info(`Creating ILM policy for managing reporting indices: ${ILM_POLICY_NAME}`);
    await ilmPolicyManager.createIlmPolicy();
  }

  /**
   * Function to be called during plugin start phase. This ensures the environment is correctly
   * configured for storage of reports.
   */
  public async start() {
    try {
      await this.createIlmPolicy();
    } catch (e) {
      this.logger.error('Error in start phase');
      this.logger.error(e.body?.error);
      throw e;
    }
  }

  private async indexReport(report: Report): Promise<IndexResponse> {
    const client = await this.getClient();
    const doc = {
      index: REPORTING_DATA_STREAM,
      id: report._id,
      op_type: 'create' as const,
      refresh: false,
      body: {
        ...report.toReportSource(),
        ...sourceDoc({
          process_expiration: new Date(0).toISOString(),
          attempts: 0,
          status: statuses.JOB_STATUS_PENDING,
        }),
      },
    };
    return await client.index(doc);
  }

  public async addReport(report: Report): Promise<SavedReport> {
    try {
      report.updateWithEsDoc(await this.indexReport(report));
      return report as SavedReport;
    } catch (err) {
      this.reportingCore.getEventLogger(report).logError(err);
      this.logError(`Error in adding a report!`, err, report);
      throw err;
    }
  }

  /*
   * Search for a report from task data and return back the report
   */
  public async findReportFromTask(
    taskJson: Pick<ReportTaskParams, 'id' | 'index'>
  ): Promise<SavedReport> {
    if (!taskJson.index) {
      throw new Error('Task JSON is missing index field!');
    }
    if (!taskJson.id || !taskJson.index) {
      const notRetrievable = new Error(`Unable to retrieve pending report: Invalid report ID!`);
      this.logger.error(notRetrievable); // for stack trace
      throw notRetrievable;
    }

    try {
      const client = await this.getClient();
      const document = await client.get<ReportSource>({
        index: taskJson.index,
        id: taskJson.id,
      });

      return new SavedReport({
        _id: document._id,
        _index: document._index,
        _seq_no: document._seq_no,
        _primary_term: document._primary_term,
        jobtype: document._source?.jobtype,
        attempts: document._source?.attempts,
        created_at: document._source?.created_at,
        created_by: document._source?.created_by,
        max_attempts: document._source?.max_attempts,
        meta: document._source?.meta,
        metrics: document._source?.metrics,
        payload: document._source?.payload,
        process_expiration: document._source?.process_expiration,
        status: document._source?.status,
        timeout: document._source?.timeout,
      });
    } catch (err) {
      this.logger.error(
        `Error in finding the report from the scheduled task info! ` +
          `[id: ${taskJson.id}] [index: ${taskJson.index}]`
      );
      this.logger.error(err);
      this.reportingCore.getEventLogger({ _id: taskJson.id } as IReport).logError(err);
      throw err;
    }
  }

  public async setReportClaimed(
    report: SavedReport,
    processingInfo: ReportProcessingFields
  ): Promise<UpdateResponse<ReportDocument>> {
    const doc = sourceDoc({
      ...processingInfo,
      status: statuses.JOB_STATUS_PROCESSING,
    });

    let body: UpdateResponse<ReportDocument>;
    try {
      const client = await this.getClient();
      body = await client.update<unknown, unknown, ReportDocument>({
        id: report._id,
        index: report._index,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: false,
        body: { doc },
      });
    } catch (err) {
      this.logError(`Error in updating status to processing! Report: ${jobDebugMessage(report)}`, err, report); // prettier-ignore
      throw err;
    }

    // log the amount of time the report waited in "pending" status
    this.reportingCore.getEventLogger(report).logClaimTask({
      queueDurationMs: moment.utc().valueOf() - moment.utc(report.created_at).valueOf(),
    });

    return body;
  }

  private logError(message: string, err: Error, report: Report) {
    this.logger.error(message);
    this.logger.error(err);
    this.reportingCore.getEventLogger(report).logError(err);
  }

  public async setReportFailed(
    report: SavedReport,
    failedInfo: ReportFailedFields
  ): Promise<UpdateResponse<ReportDocument>> {
    const doc = sourceDoc({
      ...failedInfo,
      status: statuses.JOB_STATUS_FAILED,
    });

    let body: UpdateResponse<ReportDocument>;
    try {
      const client = await this.getClient();
      body = await client.update<unknown, unknown, ReportDocument>({
        id: report._id,
        index: report._index,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: false,
        body: { doc },
      });
    } catch (err) {
      this.logError(`Error in updating status to failed! Report: ${jobDebugMessage(report)}`, err, report); // prettier-ignore
      throw err;
    }

    this.reportingCore.getEventLogger(report).logReportFailure();

    return body;
  }

  public async setReportCompleted(
    report: SavedReport,
    completedInfo: ReportCompletedFields
  ): Promise<UpdateResponse<ReportDocument>> {
    const { output } = completedInfo;
    const status =
      output && output.warnings && output.warnings.length > 0
        ? statuses.JOB_STATUS_WARNINGS
        : statuses.JOB_STATUS_COMPLETED;
    const doc = sourceDoc({
      ...completedInfo,
      status,
    } as ReportSource);

    let body: UpdateResponse<ReportDocument>;
    try {
      const client = await this.getClient();
      body = await client.update<unknown, unknown, ReportDocument>({
        id: report._id,
        index: report._index,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: false,
        body: { doc },
      });
    } catch (err) {
      this.logError(`Error in updating status to complete! Report: ${jobDebugMessage(report)}`, err, report); // prettier-ignore
      throw err;
    }

    this.reportingCore.getEventLogger(report).logReportSaved();

    return body;
  }

  public async prepareReportForRetry(report: SavedReport): Promise<UpdateResponse<ReportDocument>> {
    const doc = sourceDoc({
      status: statuses.JOB_STATUS_PENDING,
      process_expiration: null,
    });

    let body: UpdateResponse<ReportDocument>;
    try {
      const client = await this.getClient();
      body = await client.update<unknown, unknown, ReportDocument>({
        id: report._id,
        index: report._index,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: false,
        body: { doc },
      });
    } catch (err) {
      this.logError(`Error in clearing expiration and status for retry! Report: ${jobDebugMessage(report)}`, err, report); // prettier-ignore
      throw err;
    }

    return body;
  }

  /*
   * A report needs to be rescheduled when:
   *   1. An older version of Kibana created jobs with ESQueue, and they have
   *   not yet started running.
   *   2. The report process_expiration field is overdue, which happens if the
   *   report runs too long or Kibana restarts during execution
   */
  public async findStaleReportJob(): Promise<ReportRecordTimeout> {
    const client = await this.getClient();

    const expiredFilter = {
      bool: {
        must: [
          { range: { process_expiration: { lt: `now` } } },
          { terms: { status: [statuses.JOB_STATUS_PROCESSING] } },
        ],
      },
    };
    const oldVersionFilter = {
      bool: {
        must: [{ terms: { status: [statuses.JOB_STATUS_PENDING] } }],
        must_not: [{ exists: { field: 'migration_version' } }],
      },
    };

    const body = await client.search<ReportRecordTimeout['_source']>({
      size: 1,
      index: REPORTING_DATA_STREAM_WILDCARD, // add wildcard in case the data stream hasn't been created yet
      seq_no_primary_term: true,
      _source_excludes: ['output'],
      body: {
        sort: { created_at: { order: 'asc' as const } }, // find the oldest first
        query: { bool: { filter: { bool: { should: [expiredFilter, oldVersionFilter] } } } },
      },
    });

    return body.hits?.hits[0] as ReportRecordTimeout;
  }
}
