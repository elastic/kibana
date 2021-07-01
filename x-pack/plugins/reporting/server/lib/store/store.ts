/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexResponse, UpdateResponse } from '@elastic/elasticsearch/api/types';
import { ElasticsearchClient } from 'src/core/server';
import { LevelLogger, statuses } from '../';
import { ReportingCore } from '../../';
import { JobStatus } from '../../../common/types';

import { ILM_POLICY_NAME } from '../../../common/constants';

import { ReportTaskParams } from '../tasks';

import { MIGRATION_VERSION, Report, ReportDocument, ReportSource } from './report';
import { indexTimestamp } from './index_timestamp';
import { mapping } from './mapping';
import { IlmPolicyManager } from './ilm_policy_manager';

/*
 * When an instance of Kibana claims a report job, this information tells us about that instance
 */
export type ReportProcessingFields = Required<{
  kibana_id: Report['kibana_id'];
  kibana_name: Report['kibana_name'];
  browser_type: Report['browser_type'];
  attempts: Report['attempts'];
  started_at: Report['started_at'];
  timeout: Report['timeout'];
  process_expiration: Report['process_expiration'];
}>;

export type ReportFailedFields = Required<{
  completed_at: Report['completed_at'];
  output: Report['output'];
}>;

export type ReportCompletedFields = Required<{
  completed_at: Report['completed_at'];
  output: Report['output'];
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

const checkReportIsEditable = (report: Report) => {
  const { _id, _index, _seq_no, _primary_term } = report;
  if (_id == null || _index == null) {
    throw new Error(`Report is not editable: Job [${_id}] is not synced with ES!`);
  }

  if (_seq_no == null || _primary_term == null) {
    throw new Error(
      `Report is not editable: Job [${_id}] is missing _seq_no and _primary_term fields!`
    );
  }
};
/*
 * When searching for long-pending reports, we get a subset of fields
 */
const sourceDoc = (doc: Partial<ReportSource>): Partial<ReportSource> => {
  return {
    ...doc,
    migration_version: MIGRATION_VERSION,
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
  private readonly indexPrefix: string; // config setting of index prefix in system index name
  private readonly indexInterval: string; // config setting of index prefix: how often to poll for pending work
  private client?: ElasticsearchClient;
  private ilmPolicyManager?: IlmPolicyManager;

  constructor(private reportingCore: ReportingCore, private logger: LevelLogger) {
    const config = reportingCore.getConfig();

    this.indexPrefix = config.get('index');
    this.indexInterval = config.get('queue', 'indexInterval');
    this.logger = logger.clone(['store']);
  }

  private async getClient() {
    if (!this.client) {
      ({ asInternalUser: this.client } = await this.reportingCore.getEsClient());
    }

    return this.client;
  }

  private async getIlmPolicyManager() {
    if (!this.ilmPolicyManager) {
      const client = await this.getClient();
      this.ilmPolicyManager = IlmPolicyManager.create({ client });
    }

    return this.ilmPolicyManager;
  }

  private async createIndex(indexName: string) {
    const client = await this.getClient();
    const { body: exists } = await client.indices.exists({ index: indexName });

    if (exists) {
      return exists;
    }

    try {
      await client.indices.create({
        index: indexName,
        body: {
          settings: {
            number_of_shards: 1,
            auto_expand_replicas: '0-1',
            lifecycle: {
              name: ILM_POLICY_NAME,
            },
          },
          mappings: {
            properties: mapping,
          },
        },
      });

      return true;
    } catch (error) {
      const isIndexExistsError = error.message.match(/resource_already_exists_exception/);
      if (isIndexExistsError) {
        // Do not fail a job if the job runner hits the race condition.
        this.logger.warn(`Automatic index creation failed: index already exists: ${error}`);
        return;
      }

      this.logger.error(error);

      throw error;
    }
  }

  /*
   * Called from addReport, which handles any errors
   */
  private async indexReport(report: Report): Promise<IndexResponse> {
    const doc = {
      index: report._index!,
      id: report._id,
      refresh: true,
      body: {
        ...report.toReportSource(),
        ...sourceDoc({
          process_expiration: new Date(0).toISOString(),
          attempts: 0,
          status: statuses.JOB_STATUS_PENDING,
        }),
      },
    };
    const client = await this.getClient();
    const { body } = await client.index(doc);

    return body;
  }

  /*
   * Called from addReport, which handles any errors
   */
  private async refreshIndex(index: string) {
    const client = await this.getClient();

    return client.indices.refresh({ index });
  }

  /**
   * Function to be called during plugin start phase. This ensures the environment is correctly
   * configured for storage of reports.
   */
  public async start() {
    const ilmPolicyManager = await this.getIlmPolicyManager();
    try {
      if (await ilmPolicyManager.doesIlmPolicyExist()) {
        this.logger.debug(`Found ILM policy ${ILM_POLICY_NAME}; skipping creation.`);
        return;
      }
      this.logger.info(`Creating ILM policy for managing reporting indices: ${ILM_POLICY_NAME}`);
      await ilmPolicyManager.createIlmPolicy();
    } catch (e) {
      this.logger.error('Error in start phase');
      this.logger.error(e.body.error);
      throw e;
    }
  }

  public async addReport(report: Report): Promise<Report> {
    let index = report._index;
    if (!index) {
      const timestamp = indexTimestamp(this.indexInterval);
      index = `${this.indexPrefix}-${timestamp}`;
      report._index = index;
    }
    await this.createIndex(index);

    try {
      report.updateWithEsDoc(await this.indexReport(report));

      await this.refreshIndex(index);

      return report;
    } catch (err) {
      this.logger.error(`Error in adding a report!`);
      this.logger.error(err);
      throw err;
    }
  }

  /*
   * Search for a report from task data and return back the report
   */
  public async findReportFromTask(
    taskJson: Pick<ReportTaskParams, 'id' | 'index'>
  ): Promise<Report> {
    if (!taskJson.index) {
      throw new Error('Task JSON is missing index field!');
    }

    try {
      const client = await this.getClient();
      const { body: document } = await client.get<ReportSource>({
        index: taskJson.index,
        id: taskJson.id,
      });

      return new Report({
        _id: document._id,
        _index: document._index,
        _seq_no: document._seq_no,
        _primary_term: document._primary_term,
        jobtype: document._source?.jobtype,
        attempts: document._source?.attempts,
        browser_type: document._source?.browser_type,
        created_at: document._source?.created_at,
        created_by: document._source?.created_by,
        max_attempts: document._source?.max_attempts,
        meta: document._source?.meta,
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
      throw err;
    }
  }

  public async setReportClaimed(
    report: Report,
    processingInfo: ReportProcessingFields
  ): Promise<UpdateResponse<ReportDocument>> {
    const doc = sourceDoc({
      ...processingInfo,
      status: statuses.JOB_STATUS_PROCESSING,
    });

    try {
      checkReportIsEditable(report);

      const client = await this.getClient();
      const { body } = await client.update<ReportDocument>({
        id: report._id,
        index: report._index!,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: true,
        body: { doc },
      });

      return body;
    } catch (err) {
      this.logger.error(
        `Error in updating status to processing! Report: ` + jobDebugMessage(report)
      );
      this.logger.error(err);
      throw err;
    }
  }

  public async setReportFailed(
    report: Report,
    failedInfo: ReportFailedFields
  ): Promise<UpdateResponse<ReportDocument>> {
    const doc = sourceDoc({
      ...failedInfo,
      status: statuses.JOB_STATUS_FAILED,
    });

    try {
      checkReportIsEditable(report);

      const client = await this.getClient();
      const { body } = await client.update<ReportDocument>({
        id: report._id,
        index: report._index!,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: true,
        body: { doc },
      });
      return body;
    } catch (err) {
      this.logger.error(`Error in updating status to failed! Report: ` + jobDebugMessage(report));
      this.logger.error(err);
      throw err;
    }
  }

  public async setReportCompleted(
    report: Report,
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
    });

    try {
      checkReportIsEditable(report);

      const client = await this.getClient();
      const { body } = await client.update<ReportDocument>({
        id: report._id,
        index: report._index!,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: true,
        body: { doc },
      });
      return body;
    } catch (err) {
      this.logger.error(`Error in updating status to complete! Report: ` + jobDebugMessage(report));
      this.logger.error(err);
      throw err;
    }
  }

  public async prepareReportForRetry(report: Report): Promise<UpdateResponse<ReportDocument>> {
    const doc = sourceDoc({
      status: statuses.JOB_STATUS_PENDING,
      process_expiration: null,
    });

    try {
      checkReportIsEditable(report);

      const client = await this.getClient();
      const { body } = await client.update<ReportDocument>({
        id: report._id,
        index: report._index!,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: true,
        body: { doc },
      });
      return body;
    } catch (err) {
      this.logger.error(
        `Error in clearing expiration and status for retry! Report: ` + jobDebugMessage(report)
      );
      this.logger.error(err);
      throw err;
    }
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

    const { body } = await client.search<ReportRecordTimeout['_source']>({
      size: 1,
      index: this.indexPrefix + '-*',
      seq_no_primary_term: true,
      _source_excludes: ['output'],
      body: {
        sort: { created_at: { order: 'asc' as const } }, // find the oldest first
        query: { bool: { filter: { bool: { should: [expiredFilter, oldVersionFilter] } } } },
      },
    });

    return body.hits?.hits[0] as ReportRecordTimeout;
  }

  public getReportingIndexPattern(): string {
    return `${this.indexPrefix}-*`;
  }
}
