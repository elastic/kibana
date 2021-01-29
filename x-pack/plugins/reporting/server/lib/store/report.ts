/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
// @ts-ignore no module definition
import Puid from 'puid';
import { JOB_STATUSES } from '../../../common/constants';
import { ReportApiJSON, ReportDocumentHead, ReportSource } from '../../../common/types';

const puid = new Puid();

export class Report implements Partial<ReportSource> {
  public _index?: string;
  public _id: string;
  public _primary_term?: unknown; // set by ES
  public _seq_no: unknown; // set by ES

  public readonly kibana_name: ReportSource['kibana_name'];
  public readonly kibana_id: ReportSource['kibana_id'];
  public readonly jobtype: ReportSource['jobtype'];
  public readonly created_at: ReportSource['created_at'];
  public readonly created_by: ReportSource['created_by'];
  public readonly payload: ReportSource['payload'];

  public readonly meta: ReportSource['meta'];
  public readonly max_attempts: ReportSource['max_attempts'];
  public readonly browser_type?: ReportSource['browser_type'];

  public readonly status: ReportSource['status'];
  public readonly attempts: ReportSource['attempts'];
  public readonly output?: ReportSource['output'];
  public readonly started_at?: ReportSource['started_at'];
  public readonly completed_at?: ReportSource['completed_at'];
  public readonly process_expiration?: ReportSource['process_expiration'];
  public readonly priority?: ReportSource['priority'];
  public readonly timeout?: ReportSource['timeout'];

  /*
   * Create an unsaved report
   * Index string is required
   */
  constructor(opts: Partial<ReportSource> & Partial<ReportDocumentHead>) {
    this._id = opts._id != null ? opts._id : puid.generate();
    this._index = opts._index;
    this._primary_term = opts._primary_term;
    this._seq_no = opts._seq_no;

    this.payload = opts.payload!;
    this.kibana_name = opts.kibana_name!;
    this.kibana_id = opts.kibana_id!;
    this.jobtype = opts.jobtype!;
    this.max_attempts = opts.max_attempts!;
    this.attempts = opts.attempts || 0;

    this.process_expiration = opts.process_expiration;
    this.timeout = opts.timeout;

    this.created_at = opts.created_at || moment.utc().toISOString();
    this.created_by = opts.created_by || false;
    this.meta = opts.meta || { objectType: 'unknown' };
    this.browser_type = opts.browser_type;
    this.priority = opts.priority;

    this.status = opts.status || JOB_STATUSES.PENDING;
    this.output = opts.output || null;
  }

  /*
   * Update the report with "live" storage metadata
   */
  updateWithEsDoc(doc: Partial<Report>) {
    if (doc._index == null || doc._id == null) {
      throw new Error(`Report object from ES has missing fields!`);
    }

    this._id = doc._id;
    this._index = doc._index;
    this._primary_term = doc._primary_term;
    this._seq_no = doc._seq_no;
  }

  /*
   * Data structure for writing to Elasticsearch index
   */
  toEsDocsJSON() {
    return {
      _id: this._id,
      _index: this._index,
      _source: {
        jobtype: this.jobtype,
        created_at: this.created_at,
        created_by: this.created_by,
        payload: this.payload,
        meta: this.meta,
        timeout: this.timeout,
        max_attempts: this.max_attempts,
        priority: this.priority,
        browser_type: this.browser_type,
        status: this.status,
        attempts: this.attempts,
        started_at: this.started_at,
        completed_at: this.completed_at,
      },
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
      payload: this.payload,
      meta: this.meta,
      timeout: this.timeout,
      max_attempts: this.max_attempts,
      priority: this.priority,
      browser_type: this.browser_type,
      status: this.status,
      attempts: this.attempts,
      started_at: this.started_at,
      completed_at: this.completed_at,
    };
  }
}

export { ReportApiJSON, ReportSource };
