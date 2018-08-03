/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConcreteTaskInstance, ElasticJs, TaskStatus } from './task';

const DOC_TYPE = 'doc';

export interface StoreOpts {
  callCluster: ElasticJs;
  index: string;
  maxAttempts: number;
}

export interface TaskStore {
  availableTasks: (query: TaskQuery) => Promise<ConcreteTaskInstance[]>;
  update: (instance: ConcreteTaskInstance) => Promise<ConcreteTaskInstance>;
  remove: (id: string) => Promise<void>;
}

// Internal, the raw document, as stored in the Kibana index.
interface RawTaskDoc {
  _id: string;
  _index: string;
  _type: string;
  _version: number;
  _source: {
    type: string;
    runAt: Date;
    interval?: string;
    attempts: number;
    status: TaskStatus;
    params: string;
    state: string;
    user: string;
    scope: string | string[];
  };
}

export interface TaskQuery {
  types: string[];
  size: number;
}

/**
 * Wraps an elasticsearch connection and provides a task manager-specific
 * interface into the index.
 *
 * @export
 * @class ElasticTaskStore
 * @implements {TaskStore}
 */
export class ElasticTaskStore implements TaskStore {
  private callCluster: ElasticJs;
  private index: string;
  private maxAttempts: number;

  /**
   * Constructs a new ElasticTaskStore.
   * @param {StoreOpts} opts
   * @prop {CallCluster} callCluster - The elastic search connection
   * @prop {string} index - The name of the task manager index
   * @prop {number} maxAttempts - The maximum number of attempts before a task will be abandoned
   * @memberof ElasticTaskStore
   */
  constructor(opts: StoreOpts) {
    this.callCluster = opts.callCluster;
    this.index = opts.index;
    this.maxAttempts = opts.maxAttempts;
  }

  /**
   * Fetches tasks from the index, which are ready to be run.
   * - runAt is now or past
   * - id is not currently running in this instance of Kibana
   * - has a type that is in our task definitions
   *
   * @param {TaskQuery} query
   * @prop {string[]} types - Task types to be queried
   * @prop {number} size - The number of task instances to retrieve
   * @returns {Promise<TaskDoc[]>}
   * @memberof ElasticTaskStore
   */
  public async availableTasks(query: TaskQuery): Promise<ConcreteTaskInstance[]> {
    const { types, size } = query;

    const result = await this.callCluster('search', {
      body: {
        query: {
          bool: {
            must: [
              { terms: { type: types } },
              { range: { attempts: { lte: this.maxAttempts } } },
              { range: { nextRun: { lte: 'now' } } },
            ],
          },
        },
        size,
        sort: { nextRun: { order: 'asc' } },
        version: true,
      },
      index: this.index,
    });

    return (result.hits.hits as RawTaskDoc[]).map(rawToTaskDoc);
  }

  /**
   * Updates the specified doc in the index, returning the doc
   * with its version up to date.
   *
   * @param {TaskDoc} doc
   * @returns {Promise<TaskDoc>}
   * @memberof ElasticTaskStore
   */
  public async update(doc: ConcreteTaskInstance): Promise<ConcreteTaskInstance> {
    const rawDoc = taskDocToRaw(doc, this.index);

    const { _version } = await this.callCluster('update', {
      body: {
        doc: rawDoc._source,
      },
      id: doc.id,
      index: this.index,
      type: DOC_TYPE,
      version: doc.version,
    });

    return {
      ...doc,
      version: _version,
    };
  }

  /**
   * removes the specified task from the index.
   *
   * @param {string} id
   * @returns {Promise<void>}
   * @memberof ElasticTaskStore
   */
  public async remove(id: string): Promise<void> {
    return this.callCluster('delete', {
      id,
      index: this.index,
      type: DOC_TYPE,
    });
  }
}

function taskDocToRaw(doc: ConcreteTaskInstance, index: string): RawTaskDoc {
  const source = {
    ...doc,
    params: JSON.stringify(doc.params || {}),
    state: JSON.stringify(doc.state || {}),
  };

  delete source.id;
  delete source.version;

  return {
    _id: doc.id,
    _index: index,
    _source: source,
    _type: DOC_TYPE,
    _version: doc.version,
  };
}

function rawToTaskDoc(doc: RawTaskDoc): ConcreteTaskInstance {
  return {
    ...doc._source,
    id: doc._id,
    version: doc._version,
    params: parseJSONField(doc._source.params, 'params', doc),
    state: parseJSONField(doc._source.state, 'state', doc),
  };
}

function parseJSONField(json: string, fieldName: string, doc: RawTaskDoc) {
  try {
    return json ? JSON.parse(json) : {};
  } catch (error) {
    throw new Error(`Task "${doc._id}"'s ${fieldName} field has invalid JSON: ${json}`);
  }
}
