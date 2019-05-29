/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This module contains helpers for managing the task manager storage layer.
 */

import {
  TASK_MANAGER_API_VERSION as API_VERSION,
  TASK_MANAGER_TEMPLATE_VERSION as TEMPLATE_VERSION,
} from './constants';
import { Logger } from './lib/logger';
import { ConcreteTaskInstance, ElasticJs, TaskInstance, TaskStatus } from './task';

export interface StoreOpts {
  callCluster: ElasticJs;
  getKibanaUuid: () => string;
  index: string;
  maxAttempts: number;
  supportedTypes: string[];
  logger: Logger;
}

export interface FetchOpts {
  searchAfter?: any[];
  sort?: object[];
  query?: object;
}

export interface FetchResult {
  searchAfter: any[];
  docs: ConcreteTaskInstance[];
}

export interface RemoveResult {
  index: string;
  id: string;
  sequenceNumber: number;
  primaryTerm: number;
  result: string;
}

// Internal, the raw document, as stored in the Kibana index.
export interface RawTaskDoc {
  _id: string;
  _index: string;
  _seq_no: number;
  _primary_term: number;
  _source: {
    type: string;
    kibana: {
      uuid: string;
      version: number;
      apiVersion: number;
    };
    task: {
      taskType: string;
      scheduledAt: Date;
      runAt: Date;
      interval?: string;
      attempts: number;
      status: TaskStatus;
      params: string;
      state: string;
      user?: string;
      scope?: string[];
    };
  };
}

/**
 * Wraps an elasticsearch connection and provides a task manager-specific
 * interface into the index.
 */
export class TaskStore {
  public readonly maxAttempts: number;
  public getKibanaUuid: () => string;
  public readonly index: string;
  private callCluster: ElasticJs;
  private supportedTypes: string[];
  private _isInitialized = false; // eslint-disable-line @typescript-eslint/camelcase
  private logger: Logger;

  /**
   * Constructs a new TaskStore.
   * @param {StoreOpts} opts
   * @prop {CallCluster} callCluster - The elastic search connection
   * @prop {string} index - The name of the task manager index
   * @prop {number} maxAttempts - The maximum number of attempts before a task will be abandoned
   * @prop {string[]} supportedTypes - The task types supported by this store
   * @prop {Logger} logger - The task manager logger.
   */
  constructor(opts: StoreOpts) {
    this.callCluster = opts.callCluster;
    this.index = opts.index;
    this.maxAttempts = opts.maxAttempts;
    this.supportedTypes = opts.supportedTypes;
    this.logger = opts.logger;
    this.getKibanaUuid = opts.getKibanaUuid;

    this.fetchAvailableTasks = this.fetchAvailableTasks.bind(this);
  }

  public addSupportedTypes(types: string[]) {
    if (!this._isInitialized) {
      this.supportedTypes = this.supportedTypes.concat(types);
    } else {
      throw new Error('Cannot add task types after initialization');
    }
  }

  /**
   * Initializes the store, ensuring the task manager index template is created
   * and the version is up to date.
   */
  public async init() {
    if (this._isInitialized) {
      throw new Error('TaskStore has already been initialized!');
    }

    let existingVersion = -Infinity;
    const templateName = this.index;

    try {
      // check if template exists
      const templateCheck = await this.callCluster('indices.getTemplate', {
        name: templateName,
        filter_path: '*.version',
      });
      // extract the existing version
      const template = templateCheck[templateName] || {};
      existingVersion = template.version || 0;
    } catch (err) {
      if (err.statusCode !== 404) {
        throw err; // ignore not found
      }
    }

    if (existingVersion > TEMPLATE_VERSION) {
      // Do not trample a newer version template
      this.logger.warning(
        `This Kibana instance defines an older template version (${TEMPLATE_VERSION}) than is currently in Elasticsearch (${existingVersion}). ` +
          `Because of the potential for non-backwards compatible changes, this Kibana instance will only be able to claim scheduled tasks with ` +
          `"kibana.apiVersion" <= ${API_VERSION} in the task metadata.`
      );
      return;
    } else if (existingVersion === TEMPLATE_VERSION) {
      // The latest template is already saved, so just log a debug line.
      this.logger.debug(
        `Not installing ${this.index} index template: version ${TEMPLATE_VERSION} already exists.`
      );
      return;
    }

    // Activate template creation / update
    if (existingVersion > 0) {
      this.logger.info(
        `Upgrading ${
          this.index
        } index template. Old version: ${existingVersion}, New version: ${TEMPLATE_VERSION}.`
      );
    } else {
      this.logger.info(`Installing ${this.index} index template version: ${TEMPLATE_VERSION}.`);
    }

    const templateResult = await this.callCluster('indices.putTemplate', {
      name: templateName,
      body: {
        index_patterns: [this.index],
        mappings: {
          dynamic: false,
          properties: {
            type: { type: 'keyword' },
            task: {
              properties: {
                taskType: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                runAt: { type: 'date' },
                interval: { type: 'text' },
                attempts: { type: 'integer' },
                status: { type: 'keyword' },
                params: { type: 'text' },
                state: { type: 'text' },
                user: { type: 'keyword' },
                scope: { type: 'keyword' },
              },
            },
            kibana: {
              properties: {
                apiVersion: { type: 'integer' }, // 1, 2, 3, etc
                uuid: { type: 'keyword' }, //
                version: { type: 'integer' }, // 7000099, etc
              },
            },
          },
        },
        settings: {
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
        },
        version: TEMPLATE_VERSION,
      },
    });

    this._isInitialized = true;
    this.logger.info(
      `Installed ${
        this.index
      } index template: version ${TEMPLATE_VERSION} (API version ${API_VERSION})`
    );

    return templateResult;
  }

  get isInitialized() {
    return this._isInitialized;
  }

  /**
   * Schedules a task.
   *
   * @param task - The task being scheduled.
   */
  public async schedule(taskInstance: TaskInstance): Promise<ConcreteTaskInstance> {
    if (!this._isInitialized) {
      await this.init();
    }

    if (!this.supportedTypes.includes(taskInstance.taskType)) {
      throw new Error(
        `Unsupported task type "${
          taskInstance.taskType
        }". Supported types are ${this.supportedTypes.join(', ')}`
      );
    }

    const { id, ...body } = rawSource(taskInstance, this);
    const result = await this.callCluster('index', {
      id,
      body,
      index: this.index,
      refresh: true,
    });

    const { task } = body;
    return {
      ...taskInstance,
      id: result._id,
      sequenceNumber: result._seq_no,
      primaryTerm: result._primary_term,
      attempts: 0,
      status: task.status,
      scheduledAt: task.scheduledAt,
      runAt: task.runAt,
      state: taskInstance.state || {},
    };
  }

  /**
   * Fetches a paginatable list of scheduled tasks.
   *
   * @param opts - The query options used to filter tasks
   */
  public async fetch(opts: FetchOpts = {}): Promise<FetchResult> {
    const sort = paginatableSort(opts.sort);
    return this.search({
      sort,
      search_after: opts.searchAfter,
      query: opts.query,
    });
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
   * @returns {Promise<ConcreteTaskInstance[]>}
   */
  public async fetchAvailableTasks(): Promise<ConcreteTaskInstance[]> {
    const { docs } = await this.search({
      query: {
        bool: {
          must: [
            { terms: { 'task.taskType': this.supportedTypes } },
            { range: { 'task.attempts': { lte: this.maxAttempts } } },
            { range: { 'task.runAt': { lte: 'now' } } },
            { range: { 'kibana.apiVersion': { lte: API_VERSION } } },
          ],
        },
      },
      size: 10,
      sort: { 'task.runAt': { order: 'asc' } },
      seq_no_primary_term: true,
    });

    return docs;
  }

  /**
   * Updates the specified doc in the index, returning the doc
   * with its version up to date.
   *
   * @param {TaskDoc} doc
   * @returns {Promise<TaskDoc>}
   */
  public async update(doc: ConcreteTaskInstance): Promise<ConcreteTaskInstance> {
    const rawDoc = taskDocToRaw(doc, this);

    const result = await this.callCluster('update', {
      body: {
        doc: rawDoc._source,
      },
      id: doc.id,
      index: this.index,
      if_seq_no: doc.sequenceNumber,
      if_primary_term: doc.primaryTerm,
      // The refresh is important so that if we immediately look for work,
      // we don't pick up this task.
      refresh: true,
    });

    return {
      ...doc,
      sequenceNumber: result._seq_no,
      primaryTerm: result._primary_term,
    };
  }

  /**
   * Removes the specified task from the index.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  public async remove(id: string): Promise<RemoveResult> {
    const result = await this.callCluster('delete', {
      id,
      index: this.index,
      // The refresh is important so that if we immediately look for work,
      // we don't pick up this task.
      refresh: true,
    });

    return {
      index: result._index,
      id: result._id,
      sequenceNumber: result._seq_no,
      primaryTerm: result._primary_term,
      result: result.result,
    };
  }

  private async search(opts: any = {}): Promise<FetchResult> {
    const originalQuery = opts.query;
    const queryOnlyTasks = { term: { type: 'task' } };
    const query = originalQuery
      ? { bool: { must: [queryOnlyTasks, originalQuery] } }
      : queryOnlyTasks;

    const result = await this.callCluster('search', {
      index: this.index,
      ignoreUnavailable: true,
      body: {
        ...opts,
        query,
      },
    });

    const rawDocs = result.hits.hits;

    return {
      docs: (rawDocs as RawTaskDoc[]).map(rawToTaskDoc),
      searchAfter: (rawDocs.length && rawDocs[rawDocs.length - 1].sort) || [],
    };
  }
}

function paginatableSort(sort: any[] = []) {
  const sortById = { _id: 'desc' };

  if (!sort.length) {
    return [{ 'task.runAt': 'asc' }, sortById];
  }

  if (sort.find(({ _id }) => !!_id)) {
    return sort;
  }

  return [...sort, sortById];
}

function rawSource(doc: TaskInstance, store: TaskStore) {
  const { id, ...taskFields } = doc;
  const source = {
    ...taskFields,
    params: JSON.stringify(doc.params || {}),
    state: JSON.stringify(doc.state || {}),
    attempts: (doc as ConcreteTaskInstance).attempts || 0,
    scheduledAt: doc.scheduledAt || new Date(),
    runAt: doc.runAt || new Date(),
    status: (doc as ConcreteTaskInstance).status || 'idle',
  };

  delete (source as any).id;
  delete (source as any).sequenceNumber;
  delete (source as any).primaryTerm;
  delete (source as any).type;

  return {
    id,
    type: 'task',
    task: source,
    kibana: {
      uuid: store.getKibanaUuid(), // needs to be pulled live
      version: TEMPLATE_VERSION,
      apiVersion: API_VERSION,
    },
  };
}

function taskDocToRaw(doc: ConcreteTaskInstance, store: TaskStore): RawTaskDoc {
  const { type, task, kibana } = rawSource(doc, store);

  return {
    _id: doc.id,
    _index: store.index,
    _source: { type, task, kibana },
    _seq_no: doc.sequenceNumber,
    _primary_term: doc.primaryTerm,
  };
}

function rawToTaskDoc(doc: RawTaskDoc): ConcreteTaskInstance {
  return {
    ...doc._source.task,
    id: doc._id,
    sequenceNumber: doc._seq_no,
    primaryTerm: doc._primary_term,
    params: parseJSONField(doc._source.task.params, 'params', doc),
    state: parseJSONField(doc._source.task.state, 'state', doc),
  };
}

function parseJSONField(json: string, fieldName: string, doc: RawTaskDoc) {
  try {
    return json ? JSON.parse(json) : {};
  } catch (error) {
    throw new Error(`Task "${doc._id}"'s ${fieldName} field has invalid JSON: ${json}`);
  }
}
