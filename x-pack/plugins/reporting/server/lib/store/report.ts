/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore no module definition
import Puid from 'puid';
import { JobStatuses } from '../../../constants';
import { LayoutInstance } from '../layouts';

/*
 * The document created by Reporting to store in the .reporting index
 */
interface ReportingDocument {
  _id: string;
  _index: string;
  _seq_no: unknown;
  _primary_term: unknown;
  jobtype: string;
  created_by: string | false;
  payload: {
    headers: string; // encrypted headers
    objectType: string;
    layout?: LayoutInstance;
  };
  meta: unknown;
  browser_type: string;
  max_attempts: number;
  timeout: number;

  status: string;
  attempts: number;
  output?: unknown;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  priority?: number;
  process_expiration?: string;
}

/*
 * The document created by Reporting to store as task parameters for Task
 * Manager to reference the report in .reporting
 */
const puid = new Puid();

export class Report implements Partial<ReportingDocument> {
  public _index?: string;
  public _id: string;
  public _primary_term?: unknown; // set by ES
  public _seq_no: unknown; // set by ES

  public readonly jobtype: string;
  public readonly created_at?: string;
  public readonly created_by?: string | false;
  public readonly payload: {
    headers: string; // encrypted headers
    objectType: string;
    layout?: LayoutInstance;
  };
  public readonly meta: unknown;
  public readonly max_attempts: number;
  public readonly browser_type?: string;

  public readonly status: string;
  public readonly attempts: number;
  public readonly output?: unknown;
  public readonly started_at?: string;
  public readonly completed_at?: string;
  public readonly process_expiration?: string;
  public readonly priority?: number;
  public readonly timeout?: number;

  /*
   * Create an unsaved report
   */
  constructor(opts: Partial<ReportingDocument>) {
    this._id = opts._id != null ? opts._id : puid.generate();
    this._index = opts._index;
    this._primary_term = opts._primary_term;
    this._seq_no = opts._seq_no;

    this.payload = opts.payload!;
    this.jobtype = opts.jobtype!;
    this.max_attempts = opts.max_attempts!;
    this.attempts = opts.attempts || 0;

    this.process_expiration = opts.process_expiration;
    this.timeout = opts.timeout;

    this.created_at = opts.created_at;
    this.created_by = opts.created_by;
    this.meta = opts.meta;
    this.browser_type = opts.browser_type;
    this.priority = opts.priority;

    this.status = opts.status || JobStatuses.PENDING;
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
  toApiJSON() {
    return {
      id: this._id,
      index: this._index,
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
