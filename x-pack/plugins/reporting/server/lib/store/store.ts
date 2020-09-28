/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchServiceSetup } from 'src/core/server';
import { LevelLogger, statuses } from '../';
import { ReportingCore } from '../../';
import { indexTimestamp } from './index_timestamp';
import { mapping } from './mapping';
import { Report } from './report';

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
  private readonly indexPrefix: string;
  private readonly indexInterval: string;
  private client: ElasticsearchServiceSetup['legacy']['client'];
  private logger: LevelLogger;

  constructor(reporting: ReportingCore, logger: LevelLogger) {
    const config = reporting.getConfig();
    const elasticsearch = reporting.getElasticsearchService();

    this.client = elasticsearch.legacy.client;
    this.indexPrefix = config.get('index');
    this.indexInterval = config.get('queue', 'indexInterval');
    this.logger = logger;
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
        process_expiration: new Date(0), // use epoch so the job query works
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
      index = `${this.indexPrefix}-${timestamp}`;
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

  public async setReportClaimed(report: Report, stats: Partial<Report>): Promise<Report> {
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
        body: { doc },
      });
    } catch (err) {
      this.logger.error('Error in setting report processing status!');
      this.logger.error(err);
      throw err;
    }
  }

  public async setReportFailed(report: Report, stats: Partial<Report>): Promise<Report> {
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
        body: { doc },
      });
    } catch (err) {
      this.logger.error('Error in setting report failed status!');
      this.logger.error(err);
      throw err;
    }
  }

  public async setReportCompleted(report: Report, stats: Partial<Report>): Promise<Report> {
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
        body: { doc },
      });
    } catch (err) {
      this.logger.error('Error in setting report complete status!');
      this.logger.error(err);
      throw err;
    }
  }
}
