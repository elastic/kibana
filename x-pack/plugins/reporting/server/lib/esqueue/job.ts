/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from 'elasticsearch';
import events from 'events';
import { isPlainObject } from 'lodash';
// @ts-ignore
import Puid from 'puid';
import { Esqueue } from './';

import { constants } from './constants';
import { createIndex } from './helpers/create_index';

const puid = new Puid();

// tslint:disable-next-line
function noop() {}

interface JobOptions {
  client?: Client;
  created_by?: string;
  timeout?: number;
  max_attempts?: number;
  priority?: number;
  doctype?: string;
  indexSettings?: any;
  browser_type?: string;
  headers?: any;
  logger?: (...rest: any[]) => any;
}

export interface JobDocument {
  timeout: number;
  attempts: number;
  max_attempts: number;
  output?: any;
  payload?: any;
}

export interface JobResponse {
  _index: string;
  _type: string;
  _id: string;
  _version?: number;
  _source: JobDocument;
}

export class Job extends events.EventEmitter {
  public readonly queue: Esqueue;
  public readonly client: Client;
  public readonly id: string;
  public readonly index: string;
  public readonly jobtype: string;
  public readonly payload: any;
  public readonly createdBy: string | false;
  public readonly timeout: number;
  public readonly maxAttempts: number;
  public readonly priority: number;
  public readonly doctype: string;
  public readonly indexSettings: any;
  public readonly browserType?: string;

  private document?: {
    id: string;
    type: string;
    index: string;
    version: number;
  };
  private readonly ready: Promise<void>;

  constructor(queue: Esqueue, index: string, type: string, payload: any, options: JobOptions = {}) {
    if (typeof type !== 'string') {
      throw new Error('Type must be a string');
    }
    if (!isPlainObject(payload)) {
      throw new Error('Payload must be a plain object');
    }

    super();

    this.queue = queue;
    this.client = options.client || this.queue.client;
    this.id = puid.generate();
    this.index = index;
    this.jobtype = type;
    this.payload = payload;
    this.createdBy = options.created_by || false;
    this.timeout = options.timeout || 10000;
    this.maxAttempts = options.max_attempts || 3;
    this.priority = Math.max(Math.min(options.priority || 10, 20), -20);
    this.doctype = options.doctype || constants.DEFAULT_SETTING_DOCTYPE;
    this.indexSettings = options.indexSettings || {};
    this.browserType = options.browser_type;

    const debug = (msg: string, err?: Error) => {
      const logger = options.logger || noop;
      const message = `${this.id} - ${msg}`;
      const tags = ['job', 'debug'];

      if (err) {
        logger(`${message}: ${err}`, tags);
        return;
      }

      logger(message, tags);
    };

    const indexParams: any = {
      index: this.index,
      type: this.doctype,
      id: this.id,
      body: {
        jobtype: this.jobtype,
        meta: {
          // We are copying these values out of payload because these fields are indexed and can be aggregated on
          // for tracking stats, while payload contents are not.
          objectType: payload.type,
          layout: payload.layout ? payload.layout.id : 'none',
        },
        payload: this.payload,
        priority: this.priority,
        created_by: this.createdBy,
        timeout: this.timeout,
        process_expiration: new Date(0), // use epoch so the job query works
        created_at: new Date(),
        attempts: 0,
        max_attempts: this.maxAttempts,
        status: constants.JOB_STATUS_PENDING,
        browser_type: this.browserType,
      },
    };

    if (options.headers) {
      indexParams.headers = options.headers;
    }

    this.ready = createIndex(this.client, this.index, this.doctype, this.indexSettings)
      .then(() => this.client.index(indexParams))
      .then((doc: any) => {
        this.document = {
          id: doc._id,
          type: doc._type,
          index: doc._index,
          version: doc._version,
        };
        debug(`Job created in index ${this.index}`);

        return this.client.indices.refresh({
          index: this.index,
        });
      })
      .then(() => {
        debug(`Job index refreshed ${this.index}`);
        this.emit(constants.EVENT_JOB_CREATED, this.document);
      })
      .catch(err => {
        debug('Job creation failed', err);
        this.emit(constants.EVENT_JOB_CREATE_ERROR, err);
      });
  }

  public emit(name: string, ...args: any[]) {
    super.emit(name, ...args);
    return this.queue.emit(name, ...args);
  }

  public async get() {
    return this.ready
      .then(() => {
        return this.client.get({
          index: this.index,
          type: this.doctype,
          id: this.id,
        });
      })
      .then(doc => {
        return Object.assign(doc._source, {
          index: doc._index,
          id: doc._id,
          type: doc._type,
          version: doc._version,
        });
      });
  }

  public toJSON() {
    return {
      id: this.id,
      index: this.index,
      type: this.doctype,
      jobtype: this.jobtype,
      created_by: this.createdBy,
      payload: this.payload,
      timeout: this.timeout,
      max_attempts: this.maxAttempts,
      priority: this.priority,
      browser_type: this.browserType,
    };
  }
}
