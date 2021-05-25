/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'src/core/server';
import { LevelLogger, statuses } from '../';
import { ReportingCore } from '../../';
import { numberToDuration } from '../../../common/schema_utils';
import { JobStatus } from '../../../common/types';
import { ReportTaskParams } from '../tasks';
import { indexTimestamp } from './index_timestamp';
import { mapping } from './mapping';
import { Report, ReportDocument, ReportSource } from './report';
import { reportingIlmPolicy } from './report_ilm_policy';

/*
 * When searching for long-pending reports, we get a subset of fields
 */
export interface ReportRecordTimeout {
  _id: string;
  _index: string;
  _source: {
    status: JobStatus;
    process_expiration?: string;
    created_at?: string;
  };
}

const checkReportIsEditable = (report: Report) => {
  if (!report._id || !report._index) {
    throw new Error(`Report object is not synced with ES!`);
  }
};

/*
 * A class to give an interface to historical reports in the reporting.index
 * - track the state: pending, processing, completed, etc
 * - handle updates and deletes to the reporting document
 * - interface for downloading the report
 */
export class ReportingStore {
  private readonly indexPrefix: string; // config setting of index prefix in system index name
  private readonly indexInterval: string; // config setting of index prefix: how often to poll for pending work
  private readonly queueTimeoutMins: number; // config setting of queue timeout, rounded up to nearest minute
  private client?: ElasticsearchClient;

  constructor(private reportingCore: ReportingCore, private logger: LevelLogger) {
    const config = reportingCore.getConfig();

    this.indexPrefix = config.get('index');
    this.indexInterval = config.get('queue', 'indexInterval');
    this.logger = logger.clone(['store']);
    this.queueTimeoutMins = Math.ceil(numberToDuration(config.get('queue', 'timeout')).asMinutes());
  }

  private async getClient() {
    if (!this.client) {
      ({ asInternalUser: this.client } = await this.reportingCore.getEsClient());
    }

    return this.client;
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
              name: this.ilmPolicyName,
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
  private async indexReport(report: Report) {
    const doc = {
      index: report._index!,
      id: report._id,
      body: {
        ...report.toEsDocsJSON()._source,
        process_expiration: new Date(0), // use epoch so the job query works
        attempts: 0,
        status: statuses.JOB_STATUS_PENDING,
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

  private readonly ilmPolicyName = 'kibana-reporting';

  private async doesIlmPolicyExist(): Promise<boolean> {
    const client = await this.getClient();
    try {
      await client.ilm.getLifecycle({ policy: this.ilmPolicyName });
      return true;
    } catch (e) {
      if (e.statusCode === 404) {
        return false;
      }
      throw e;
    }
  }

  /**
   * Function to be called during plugin start phase. This ensures the environment is correctly
   * configured for storage of reports.
   */
  public async start() {
    const client = await this.getClient();
    try {
      if (await this.doesIlmPolicyExist()) {
        this.logger.debug(`Found ILM policy ${this.ilmPolicyName}; skipping creation.`);
        return;
      }
      this.logger.info(`Creating ILM policy for managing reporting indices: ${this.ilmPolicyName}`);
      await client.ilm.putLifecycle({
        policy: this.ilmPolicyName,
        body: reportingIlmPolicy,
      });
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
      const doc = await this.indexReport(report);
      report.updateWithEsDoc(doc);

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
  public async findReportFromTask(taskJson: ReportTaskParams): Promise<Report> {
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
      this.logger.error('Error in finding a report! ' + JSON.stringify({ report: taskJson }));
      this.logger.error(err);
      throw err;
    }
  }

  public async setReportPending(report: Report) {
    const doc = { status: statuses.JOB_STATUS_PENDING };

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

      return (body as unknown) as ReportDocument;
    } catch (err) {
      this.logger.error('Error in setting report pending status!');
      this.logger.error(err);
      throw err;
    }
  }

  public async setReportClaimed(report: Report, stats: Partial<Report>): Promise<ReportDocument> {
    const doc = {
      ...stats,
      status: statuses.JOB_STATUS_PROCESSING,
    };

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

      return (body as unknown) as ReportDocument;
    } catch (err) {
      this.logger.error('Error in setting report processing status!');
      this.logger.error(err);
      throw err;
    }
  }

  public async setReportFailed(report: Report, stats: Partial<Report>): Promise<ReportDocument> {
    const doc = {
      ...stats,
      status: statuses.JOB_STATUS_FAILED,
    };

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

      return (body as unknown) as ReportDocument;
    } catch (err) {
      this.logger.error('Error in setting report failed status!');
      this.logger.error(err);
      throw err;
    }
  }

  public async setReportCompleted(report: Report, stats: Partial<Report>): Promise<ReportDocument> {
    try {
      const { output } = stats;
      const status =
        output && output.warnings && output.warnings.length > 0
          ? statuses.JOB_STATUS_WARNINGS
          : statuses.JOB_STATUS_COMPLETED;
      const doc = {
        ...stats,
        status,
      };
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

      return (body as unknown) as ReportDocument;
    } catch (err) {
      this.logger.error('Error in setting report complete status!');
      this.logger.error(err);
      throw err;
    }
  }

  public async clearExpiration(report: Report): Promise<ReportDocument> {
    try {
      checkReportIsEditable(report);

      const client = await this.getClient();
      const { body } = await client.update<ReportDocument>({
        id: report._id,
        index: report._index!,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: true,
        body: { doc: { process_expiration: null } },
      });

      return (body as unknown) as ReportDocument;
    } catch (err) {
      this.logger.error('Error in clearing expiration!');
      this.logger.error(err);
      throw err;
    }
  }

  /*
   * A zombie report document is one that isn't completed or failed, isn't
   * being executed, and isn't scheduled to run. They arise:
   * - when the cluster has processing documents in ESQueue before upgrading to v7.13 when ESQueue was removed
   * - if Kibana crashes while a report task is executing and it couldn't be rescheduled on its own
   *
   * Pending reports are not included in this search: they may be scheduled in TM just not run yet.
   * TODO Should we get a list of the reports that are pending and scheduled in TM so we can exclude them from this query?
   */
  public async findZombieReportDocuments(): Promise<ReportRecordTimeout[] | null> {
    const client = await this.getClient();
    const { body } = await client.search<ReportRecordTimeout['_source']>({
      index: this.indexPrefix + '-*',
      filter_path: 'hits.hits',
      body: {
        sort: { created_at: { order: 'desc' } },
        query: {
          bool: {
            filter: [
              {
                bool: {
                  must: [
                    { range: { process_expiration: { lt: `now-${this.queueTimeoutMins}m` } } },
                    { terms: { status: [statuses.JOB_STATUS_PROCESSING] } },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    return body.hits?.hits as ReportRecordTimeout[];
  }
}
