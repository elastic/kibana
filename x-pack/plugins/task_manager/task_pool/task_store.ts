/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CallCluster,
  TaskDoc,
  TaskQuery,
  TaskStatus,
  TaskStore,
} from './types';

const DOC_TYPE = 'doc';

export interface StoreOpts {
  callCluster: CallCluster;
  index: string;
  maxPoolSize: number;
}

// Internal, the raw document, as stored in the Kibana index.
interface RawTaskDoc {
  _id: string;
  _index: string;
  _type: string;
  _version: number;
  _source: {
    attempts: number;
    status: TaskStatus;
    type: string;
    params: string;
    previousResult: string;
    nextRun: Date;
    timeOut: Date | null;
    interval?: string;
  };
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
  private callCluster: CallCluster;
  private index: string;
  private maxPoolSize: number;

  /**
   * Constructs a new ElasticTaskStore.
   * @param {StoreOpts} opts
   * @prop {CallCluster} callCluster - The elastic search connection
   * @prop {string} index - The name of the task manager index
   * @prop {number} maxPoolSize - The maximum number of tasks to run at a time
   * @memberof ElasticTaskStore
   */
  constructor(opts: StoreOpts) {
    this.callCluster = opts.callCluster;
    this.index = opts.index;
    this.maxPoolSize = opts.maxPoolSize;
  }

  /**
   * Fetches tasks from the index, which are ready to be run.
   * - nextRun is now or past
   * - timeOut is now or past
   * - id is not currently running in this instance of Kibana
   * - has a type that is in our task definitions
   *
   * @param {TaskQuery} query
   * @prop {string[]} knownTypes - Types that are known by this Kibana instance
   * @prop {string[]} runningIds - Ids of tasks that are currently running in this Kibana instance
   * @returns {Promise<TaskDoc[]>}
   * @memberof ElasticTaskStore
   */
  public async availableTasks(query: TaskQuery): Promise<TaskDoc[]> {
    const { knownTypes, runningIds } = query;

    const result = await this.callCluster('search', {
      body: {
        query: {
          bool: {
            must: {
              terms: {
                type: knownTypes,
              },
            },
            must_not: {
              ids: {
                values: runningIds,
              },
            },
            should: [
              {
                bool: {
                  must: [
                    { term: { status: { value: 'idle' } } },
                    { range: { nextRun: { lte: 'now' } } },
                  ],
                },
              },
              {
                bool: {
                  must: [
                    { term: { status: { value: 'running' } } },
                    { range: { timeOut: { lte: 'now' } } },
                  ],
                },
              },
            ],
          },
        },
        size: this.maxPoolSize,
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
  public async update(doc: TaskDoc): Promise<TaskDoc> {
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

function taskDocToRaw(doc: TaskDoc, index: string): RawTaskDoc {
  return {
    _id: doc.id,
    _index: index,
    _source: {
      attempts: doc.attempts,
      interval: doc.interval,
      nextRun: doc.nextRun,
      params: JSON.stringify(doc.params),
      previousResult: JSON.stringify(doc.previousResult),
      status: doc.status,
      timeOut: doc.timeOut,
      type: doc.type,
    },
    _type: DOC_TYPE,
    _version: doc.version,
  };
}

function rawToTaskDoc(doc: RawTaskDoc): TaskDoc {
  const {
    attempts,
    interval,
    nextRun,
    params,
    previousResult,
    status,
    timeOut,
    type,
  } = doc._source;

  return {
    attempts,
    id: doc._id,
    interval,
    nextRun,
    params: parseJSONField(params, 'params', doc),
    previousResult: parseJSONField(previousResult, 'previousResult', doc),
    status,
    timeOut,
    type,
    version: doc._version,
  };
}

function parseJSONField(json: string, fieldName: string, doc: RawTaskDoc) {
  try {
    return json ? JSON.parse(json) : {};
  } catch (error) {
    throw new Error(
      `Task "${doc._id}"'s ${fieldName} field has invalid JSON: ${json}`
    );
  }
}
