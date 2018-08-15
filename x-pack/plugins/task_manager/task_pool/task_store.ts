/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConcreteTaskInstance, ElasticJs, TaskInstance, TaskStatus } from './task';

const DOC_TYPE = 'doc';

export interface StoreOpts {
  callCluster: ElasticJs;
  index: string;
  maxAttempts: number;
}

export interface FetchOpts {
  searchAfter?: any[];
  sort?: object[];
}

export interface FetchResult {
  searchAfter: any[];
  docs: ConcreteTaskInstance[];
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
 */
export class TaskStore {
  private callCluster: ElasticJs;
  private index: string;
  private maxAttempts: number;

  /**
   * Constructs a new TaskStore.
   * @param {StoreOpts} opts
   * @prop {CallCluster} callCluster - The elastic search connection
   * @prop {string} index - The name of the task manager index
   * @prop {number} maxAttempts - The maximum number of attempts before a task will be abandoned
   */
  constructor(opts: StoreOpts) {
    this.callCluster = opts.callCluster;
    this.index = opts.index;
    this.maxAttempts = opts.maxAttempts;
  }

  public async init() {
    const properties = {
      type: { type: 'keyword' },
      runAt: { type: 'date' },
      interval: { type: 'text' },
      attempts: { type: 'integer' },
      status: { type: 'keyword' },
      params: { type: 'text' },
      state: { type: 'text' },
      user: { type: 'keyword' },
      scope: { type: 'keyword' },
    };

    try {
      await this.callCluster('indices.create', {
        index: this.index,
        body: {
          mappings: {
            doc: {
              dynamic: 'strict',
              properties,
            },
          },
        },
      });
    } catch (err) {
      if (
        !err.body ||
        !err.body.error ||
        err.body.error.type !== 'resource_already_exists_exception'
      ) {
        throw err;
      }
      return this.callCluster('indices.putMapping', {
        index: this.index,
        type: DOC_TYPE,
        body: {
          properties,
        },
      });
    }
  }

  public schedule(task: TaskInstance) {
    return this.callCluster('index', {
      index: this.index,
      type: DOC_TYPE,
      body: rawSource(task),
      refresh: true,
    });
  }

  public async fetch(opts: FetchOpts = {}): Promise<FetchResult> {
    const sort = paginatableSort(opts.sort);
    const docs = await this.search({
      body: {
        sort,
        search_after: opts.searchAfter,
      },
    });
    const searchAfter = nextSearchAfter(docs.length && docs[docs.length - 1], sort);

    return { docs, searchAfter };
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
   */
  public availableTasks(query: TaskQuery): Promise<ConcreteTaskInstance[]> {
    const { types, size } = query;

    return this.search({
      body: {
        query: {
          bool: {
            must: [
              { terms: { type: types } },
              { range: { attempts: { lte: this.maxAttempts } } },
              { range: { runAt: { lte: 'now' } } },
            ],
          },
        },
        size,
        sort: { runAt: { order: 'asc' } },
        version: true,
      },
    });
  }

  /**
   * Updates the specified doc in the index, returning the doc
   * with its version up to date.
   *
   * @param {TaskDoc} doc
   * @returns {Promise<TaskDoc>}
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
      refresh: true,
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
   */
  public async remove(id: string): Promise<void> {
    return this.callCluster('delete', {
      id,
      index: this.index,
      type: DOC_TYPE,
      refresh: true,
    });
  }

  private async search(opts: object = {}): Promise<ConcreteTaskInstance[]> {
    const result = await this.callCluster('search', {
      type: DOC_TYPE,
      index: this.index,
      ...opts,
    });

    return (result.hits.hits as RawTaskDoc[]).map(rawToTaskDoc);
  }
}

function paginatableSort(sort: any[] = []) {
  if (!sort.length) {
    return [{ runAt: 'asc' }, { _id: 'desc' }];
  }

  if (sort.find(({ _id }) => !!_id)) {
    return sort;
  }

  return [...sort, { _id: 'desc' }];
}

function nextSearchAfter(doc?: any, sort?: object[]): any[] {
  if (!doc || !sort) {
    return [];
  }

  return sort.map(opt => {
    const [field] = Object.keys(opt);
    return doc[field.startsWith('_') ? field.slice(1) : field];
  });
}

function rawSource(doc: TaskInstance) {
  const source = {
    ...doc,
    params: JSON.stringify(doc.params || {}),
    state: JSON.stringify(doc.state || {}),
  };

  delete (source as any).id;
  delete (source as any).version;

  return source;
}

function taskDocToRaw(doc: ConcreteTaskInstance, index: string): RawTaskDoc {
  return {
    _id: doc.id,
    _index: index,
    _source: rawSource(doc),
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
