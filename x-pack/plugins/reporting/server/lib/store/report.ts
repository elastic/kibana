/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import moment from 'moment';
import Puid from 'puid';
import { JOB_STATUSES } from '../../../common/constants';
import {
  ReportApiJSON,
  ReportDocument,
  ReportDocumentHead,
  ReportSource,
} from '../../../common/types';
import type { ReportTaskParams } from '../tasks';

export type { ReportDocument };
export type { ReportApiJSON, ReportSource };

const puid = new Puid();
export const MIGRATION_VERSION = '7.14.0';

/*
 * Class for an ephemeral report document: possibly is not saved in Elasticsearch
 */
export class Report implements Partial<ReportSource & ReportDocumentHead> {
  public _index?: string;
  public _id: string;
  public _primary_term?: number; // set by ES
  public _seq_no?: number; // set by ES

  public readonly jobtype: ReportSource['jobtype'];
  public readonly created_at: ReportSource['created_at'];
  public readonly created_by: ReportSource['created_by'];
  public readonly payload: ReportSource['payload'];

  public readonly meta: ReportSource['meta'];

  public readonly status: ReportSource['status'];
  public readonly attempts: ReportSource['attempts'];

  // fields with undefined values exist in report jobs that have not been claimed
  public readonly kibana_name: ReportSource['kibana_name'];
  public readonly kibana_id: ReportSource['kibana_id'];
  public readonly output: ReportSource['output'];
  public readonly started_at: ReportSource['started_at'];
  public readonly completed_at: ReportSource['completed_at'];
  public readonly timeout: ReportSource['timeout'];
  public readonly max_attempts: ReportSource['max_attempts'];
  public readonly metrics?: ReportSource['metrics'];

  public process_expiration?: ReportSource['process_expiration'];
  public migration_version: string;

  /*
   * Create an unsaved report
   * Index string is required
   */
  constructor(opts: Partial<ReportSource> & Partial<ReportDocumentHead>) {
    this._id = opts._id != null ? opts._id : puid.generate();
    this._index = opts._index;
    this._primary_term = opts._primary_term;
    this._seq_no = opts._seq_no;

    this.migration_version = MIGRATION_VERSION;

    // see RequestHandler.enqueueJob for all the fields that are expected to exist when adding a report
    if (opts.jobtype == null) {
      throw new Error(`jobtype is expected!`);
    }
    if (opts.payload == null) {
      throw new Error(`payload is expected!`);
    }

    this.payload = opts.payload;
    this.kibana_id = opts.kibana_id;
    this.kibana_name = opts.kibana_name;
    this.jobtype = opts.jobtype;
    this.max_attempts = opts.max_attempts;
    this.attempts = opts.attempts || 0;
    this.timeout = opts.timeout;

    this.process_expiration = opts.process_expiration;
    this.started_at = opts.started_at;
    this.completed_at = opts.completed_at;
    this.created_at = opts.created_at || moment.utc().toISOString();
    this.created_by = opts.created_by || false;
    this.meta = opts.meta || { objectType: 'unknown' };
    this.metrics = opts.metrics;

    this.status = opts.status || JOB_STATUSES.PENDING;
    this.output = opts.output || null;
  }

  /*
   * Update the report with "live" storage metadata
   */
  updateWithEsDoc(doc: Partial<Report>): void {
    if (doc._index == null || doc._id == null) {
      throw new Error(`Report object from ES has missing fields!`);
    }

    this._id = doc._id;
    this._index = doc._index;
    this._primary_term = doc._primary_term;
    this._seq_no = doc._seq_no;
    this.migration_version = MIGRATION_VERSION;
  }

  /*
   * Data structure for writing to Elasticsearch index
   */
  toReportSource(): ReportSource {
    return {
      migration_version: MIGRATION_VERSION,
      kibana_name: this.kibana_name,
      kibana_id: this.kibana_id,
      jobtype: this.jobtype,
      created_at: this.created_at,
      created_by: this.created_by,
      payload: this.payload,
      meta: this.meta,
      timeout: this.timeout,
      max_attempts: this.max_attempts,
      status: this.status,
      attempts: this.attempts,
      started_at: this.started_at,
      completed_at: this.completed_at,
      process_expiration: this.process_expiration,
      output: this.output || null,
      metrics: this.metrics,
    };
  }

  /*
   * Parameters to save in a task instance
   */
  toReportTaskJSON(): ReportTaskParams {
    if (!this._index) {
      throw new Error(`Task is missing the _index field!`);
    }

    return {
      id: this._id,
      index: this._index,
      jobtype: this.jobtype,
      created_at: this.created_at,
      created_by: this.created_by,
      payload: this.payload,
      meta: this.meta,
      attempts: this.attempts,
    };
  }

  /*
   * Data structure for API responses
   */
  toApiJSON(): ReportApiJSON {
    return {
      id: this._id,
      index: this._index!,
      kibana_name: this.kibana_name,
      kibana_id: this.kibana_id,
      jobtype: this.jobtype,
      created_at: this.created_at,
      created_by: this.created_by,
      meta: this.meta,
      timeout: this.timeout,
      max_attempts: this.max_attempts,
      status: this.status,
      attempts: this.attempts,
      started_at: this.started_at,
      completed_at: this.completed_at,
      migration_version: this.migration_version,
      payload: omit(this.payload, 'headers'),
      output: omit(this.output, 'content'),
      metrics: this.metrics,
    };
  }
}
