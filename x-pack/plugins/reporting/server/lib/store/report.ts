/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore no module definition
import Puid from 'puid';

interface Payload {
  id?: string;
  index: string;
  jobtype: string;
  created_by: string | boolean;
  payload: unknown;
  browser_type: string;
  priority: number;
  max_attempts: number;
  timeout: number;
}

const puid = new Puid();

export class Report {
  public readonly jobtype: string;
  public readonly created_by: string | boolean;
  public readonly payload: unknown;
  public readonly browser_type: string;
  public readonly id: string;

  public readonly priority: number;
  // queue stuff, to be removed with Task Manager integration
  public readonly max_attempts: number;
  public readonly timeout: number;

  public _index: string;
  public _id?: string; // set by ES
  public _primary_term?: unknown; // set by ES
  public _seq_no: unknown; // set by ES

  /*
   * Create an unsaved report
   */
  constructor(opts: Payload) {
    this.jobtype = opts.jobtype;
    this.created_by = opts.created_by;
    this.payload = opts.payload;
    this.browser_type = opts.browser_type;
    this.priority = opts.priority;
    this.max_attempts = opts.max_attempts;
    this.timeout = opts.timeout;
    this.id = puid.generate();

    this._index = opts.index;
  }

  /*
   * Update the report with "live" storage metadata
   */
  updateWithDoc(doc: Partial<Report>) {
    if (doc._index) {
      this._index = doc._index; // can not be undefined
    }

    this._id = doc._id;
    this._primary_term = doc._primary_term;
    this._seq_no = doc._seq_no;
  }

  toJSON() {
    return {
      id: this.id,
      index: this._index,
      _seq_no: this._seq_no,
      _primary_term: this._primary_term,
      jobtype: this.jobtype,
      created_by: this.created_by,
      payload: this.payload,
      timeout: this.timeout,
      max_attempts: this.max_attempts,
      priority: this.priority,
      browser_type: this.browser_type,
    };
  }
}
