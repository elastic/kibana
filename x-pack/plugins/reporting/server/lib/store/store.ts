/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchServiceSetup } from 'src/core/server';
import { LevelLogger } from '../';
import { ReportingCore } from '../../';
import { LayoutInstance } from '../../export_types/common/layouts';
import { indexTimestamp } from './index_timestamp';
import { mapping } from './mapping';
import { Report } from './report';

export const statuses = {
  JOB_STATUS_PENDING: 'pending',
  JOB_STATUS_PROCESSING: 'processing',
  JOB_STATUS_COMPLETED: 'completed',
  JOB_STATUS_WARNINGS: 'completed_with_warnings',
  JOB_STATUS_FAILED: 'failed',
  JOB_STATUS_CANCELLED: 'cancelled',
};

interface AddReportOpts {
  timeout: number;
  created_by: string | boolean;
  browser_type: string;
  max_attempts: number;
}

interface UpdateQuery {
  index: string;
  id: string;
  if_seq_no: unknown;
  if_primary_term: unknown;
  body: { doc: Partial<Report> };
}

/*
 * A class to give an interface to historical reports in the reporting.index
 * - track the state: pending, processing, completed, etc
 * - handle updates and deletes to the reporting document
 * - interface for downloading the report
 */
export class ReportingStore {
  public readonly indexPrefix: string;
  public readonly indexInterval: string;

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
    return this.client
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

            throw err;
          });
      });
  }

  private async saveReport(report: Report) {
    const payload = report.payload as { objectType: string; layout: LayoutInstance };

    const indexParams = {
      index: report._index,
      id: report.id,
      body: {
        jobtype: report.jobtype,
        meta: {
          // We are copying these values out of payload because these fields are indexed and can be aggregated on
          // for tracking stats, while payload contents are not.
          objectType: payload.objectType,
          layout: payload.layout ? payload.layout.id : 'none',
        },
        payload: report.payload,
        created_by: report.created_by,
        timeout: report.timeout,
        process_expiration: new Date(0), // use epoch so the job query works
        created_at: new Date(),
        attempts: 0,
        max_attempts: report.max_attempts,
        status: statuses.JOB_STATUS_PENDING,
        browser_type: report.browser_type,
      },
    };
    return this.client.callAsInternalUser('index', indexParams);
  }

  private async refreshIndex(index: string) {
    return this.client.callAsInternalUser('indices.refresh', { index });
  }

  public async addReport(type: string, payload: unknown, options: AddReportOpts): Promise<Report> {
    const timestamp = indexTimestamp(this.indexInterval);
    const index = `${this.indexPrefix}-${timestamp}`;
    await this.createIndex(index);

    const report = new Report({
      index,
      payload,
      jobtype: type,
      created_by: options.created_by,
      browser_type: options.browser_type,
      max_attempts: options.max_attempts,
      timeout: options.timeout,
      priority: 10, // unused
    });

    const doc = await this.saveReport(report);
    report.updateWithDoc(doc);

    await this.refreshIndex(index);
    this.logger.info(`Successfully queued pending job: ${report._index}/${report.id}`);

    return report;
  }

  public async updateReport(query: UpdateQuery): Promise<Report> {
    return this.client.callAsInternalUser('update', {
      index: query.index,
      id: query.id,
      if_seq_no: query.if_seq_no,
      if_primary_term: query.if_primary_term,
      body: { doc: query.body.doc },
    });
  }
}
