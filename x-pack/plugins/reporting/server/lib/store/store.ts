/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchParams } from 'elasticsearch';
import { ElasticsearchServiceSetup } from 'src/core/server';
import { LevelLogger, statuses } from '../';
import { ReportingCore } from '../../';
import { numberToDuration } from '../../../common/schema_utils';
import { JobStatus } from '../../../common/types';
import { ReportTaskParams } from '../tasks';
import { indexTimestamp } from './index_timestamp';
import { mapping } from './mapping';
import { Report, ReportDocument } from './report';

/*
 * When searching for zombie reports, we get a subset of fields
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
  private readonly index: string; // config setting of index prefix in system index name
  private readonly indexInterval: string; // config setting of index prefix: how often to poll for pending work
  private readonly queueTimeoutMins: number; // config setting of queue timeout, rounded up to nearest minute
  private client: ElasticsearchServiceSetup['legacy']['client'];
  private logger: LevelLogger;

  constructor(reporting: ReportingCore, parentLogger: LevelLogger) {
    const config = reporting.getConfig();
    const elasticsearch = reporting.getElasticsearchService();

    this.logger = parentLogger.clone(['store']);
    this.client = elasticsearch.legacy.client;
    this.index = config.get('index');
    this.indexInterval = config.get('queue', 'indexInterval');
    this.queueTimeoutMins = Math.ceil(numberToDuration(config.get('queue', 'timeout')).asMinutes());
  }

  private async createIndex(indexName: string) {
    return await this.client
      .callAsInternalUser('indices.exists', {
        index: indexName,
      })
      .then((exists) => {
        if (exists) {
          return exists;
        }

        const indexSettings = {
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
        };
        const body = {
          settings: indexSettings,
          mappings: {
            properties: mapping,
          },
        };

        return this.client
          .callAsInternalUser('indices.create', {
            index: indexName,
            body,
          })
          .then(() => true)
          .catch((err: Error) => {
            const isIndexExistsError = err.message.match(/resource_already_exists_exception/);
            if (isIndexExistsError) {
              // Do not fail a job if the job runner hits the race condition.
              this.logger.warn(`Automatic index creation failed: index already exists: ${err}`);
              return;
            }

            this.logger.error(err);
            throw err;
          });
      });
  }

  /*
   * Called from addReport, which handles any errors
   */
  private async indexReport(report: Report) {
    const doc = {
      index: report._index,
      id: report._id,
      body: {
        ...report.toEsDocsJSON()._source,
        process_expiration: null,
        attempts: 0,
        status: statuses.JOB_STATUS_PENDING,
      },
    };
    return await this.client.callAsInternalUser('index', doc);
  }

  /*
   * Called from addReport, which handles any errors
   */
  private async refreshIndex(index: string) {
    return await this.client.callAsInternalUser('indices.refresh', { index });
  }

  public async addReport(report: Report): Promise<Report> {
    let index = report._index;
    if (!index) {
      const timestamp = indexTimestamp(this.indexInterval);
      index = `${this.index}-${timestamp}`;
      report._index = index;
    }
    await this.createIndex(index);

    try {
      const doc = await this.indexReport(report);
      report.updateWithEsDoc(doc);

      await this.refreshIndex(index);
      this.logger.debug(`Successfully stored pending job: ${report._index}/${report._id}`);

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
      const document = await this.client.callAsInternalUser<ReportDocument>('get', {
        index: taskJson.index,
        id: taskJson.id,
      });

      return new Report({
        _id: document._id,
        _index: document._index,
        _seq_no: document._seq_no,
        _primary_term: document._primary_term,
        jobtype: document._source.jobtype,
        attempts: document._source.attempts,
        browser_type: document._source.browser_type,
        created_at: document._source.created_at,
        created_by: document._source.created_by,
        max_attempts: document._source.max_attempts,
        meta: document._source.meta,
        payload: document._source.payload,
        process_expiration: document._source.process_expiration,
        status: document._source.status,
        timeout: document._source.timeout,
        priority: document._source.priority,
      });
    } catch (err) {
      this.logger.error('Error in finding a report! ' + JSON.stringify({ report: taskJson }));
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

      return await this.client.callAsInternalUser('update', {
        id: report._id,
        index: report._index,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: true,
        body: { doc },
      });
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

      return await this.client.callAsInternalUser('update', {
        id: report._id,
        index: report._index,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: true,
        body: { doc },
      });
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

      return await this.client.callAsInternalUser('update', {
        id: report._id,
        index: report._index,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: true,
        body: { doc },
      });
    } catch (err) {
      this.logger.error('Error in setting report complete status!');
      this.logger.error(err);
      throw err;
    }
  }

  public async clearExpiration(report: Report): Promise<ReportDocument> {
    try {
      checkReportIsEditable(report);

      const updateParams = {
        id: report._id,
        index: report._index,
        if_seq_no: report._seq_no,
        if_primary_term: report._primary_term,
        refresh: true,
        body: { doc: { process_expiration: null } },
      };

      return await this.client.callAsInternalUser('update', updateParams);
    } catch (err) {
      this.logger.error('Error in resetting expired report document!');
      this.logger.error(err);
      throw err;
    }
  }

  /*
   * Finds timing-out jobs stuck in pending or processing status
   */
  public async findExpiredReports(): Promise<ReportRecordTimeout[] | null> {
    const searchParams: SearchParams = {
      index: this.index + '-*',
      filterPath: 'hits.hits',
      body: {
        sort: { created_at: { order: 'desc' } },
        query: {
          bool: {
            filter: [
              {
                bool: {
                  must: [
                    { range: { process_expiration: { lt: `now-${this.queueTimeoutMins}m` } } },
                    {
                      terms: {
                        status: [statuses.JOB_STATUS_PENDING, statuses.JOB_STATUS_PROCESSING],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    };

    const result = await this.client.callAsInternalUser<ReportRecordTimeout['_source']>(
      'search',
      searchParams
    );

    if (result.hits?.hits.length) {
      this.logger.info(
        `Found ${result.hits?.hits.length} expired reports waiting to be rescheduled.`
      );
    } else {
      this.logger.debug(`Found 0 expired reports.`);
    }

    return result.hits?.hits;
  }
}
