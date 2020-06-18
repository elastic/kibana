/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This module contains helpers for managing the task manager storage layer.
 */
import apm from 'elastic-apm-node';
import { Subject, Observable } from 'rxjs';
import { omit, difference, defaults } from 'lodash';

import { SearchResponse, UpdateDocumentByQueryResponse } from 'elasticsearch';
import {
  SavedObject,
  SavedObjectsSerializer,
  SavedObjectsRawDoc,
  ISavedObjectsRepository,
} from '../../../../src/core/server';

import { asOk, asErr } from './lib/result_type';

import {
  ConcreteTaskInstance,
  ElasticJs,
  TaskDefinition,
  TaskDictionary,
  TaskInstance,
  TaskLifecycle,
  TaskLifecycleResult,
  SerializedConcreteTaskInstance,
} from './task';

import { TaskClaim, asTaskClaimEvent } from './task_events';

import {
  asUpdateByQuery,
  shouldBeOneOf,
  mustBeAllOf,
  filterDownBy,
  ExistsFilter,
  TermFilter,
  RangeFilter,
  asPinnedQuery,
  matchesClauses,
} from './queries/query_clauses';

import {
  updateFields,
  IdleTaskWithExpiredRunAt,
  InactiveTasks,
  RunningOrClaimingTaskWithExpiredRetryAt,
  TaskWithSchedule,
  taskWithLessThanMaxAttempts,
  SortByRunAtAndRetryAt,
  tasksClaimedByOwner,
} from './queries/mark_available_tasks_as_claimed';

export interface StoreOpts {
  callCluster: ElasticJs;
  index: string;
  taskManagerId: string;
  maxAttempts: number;
  definitions: TaskDictionary<TaskDefinition>;
  savedObjectsRepository: ISavedObjectsRepository;
  serializer: SavedObjectsSerializer;
}

export interface SearchOpts {
  sort?: string | object | object[];
  query?: object;
  size?: number;
  seq_no_primary_term?: boolean;
  search_after?: unknown[];
}

export interface UpdateByQuerySearchOpts extends SearchOpts {
  script?: object;
}

export interface UpdateByQueryOpts extends SearchOpts {
  max_docs?: number;
}

export interface OwnershipClaimingOpts {
  claimOwnershipUntil: Date;
  claimTasksById?: string[];
  size: number;
}

export interface FetchResult {
  docs: ConcreteTaskInstance[];
}

export interface ClaimOwnershipResult {
  claimedTasks: number;
  docs: ConcreteTaskInstance[];
}

export interface BulkUpdateTaskFailureResult {
  error: NonNullable<SavedObject['error']>;
  task: ConcreteTaskInstance;
}

export interface UpdateByQueryResult {
  updated: number;
  version_conflicts: number;
  total: number;
}

/**
 * Wraps an elasticsearch connection and provides a task manager-specific
 * interface into the index.
 */
export class TaskStore {
  public readonly maxAttempts: number;
  public readonly index: string;
  public readonly taskManagerId: string;

  private callCluster: ElasticJs;
  private definitions: TaskDictionary<TaskDefinition>;
  private savedObjectsRepository: ISavedObjectsRepository;
  private serializer: SavedObjectsSerializer;
  private events$: Subject<TaskClaim>;

  /**
   * Constructs a new TaskStore.
   * @param {StoreOpts} opts
   * @prop {CallCluster} callCluster - The elastic search connection
   * @prop {string} index - The name of the task manager index
   * @prop {number} maxAttempts - The maximum number of attempts before a task will be abandoned
   * @prop {TaskDefinition} definition - The definition of the task being run
   * @prop {serializer} - The saved object serializer
   * @prop {savedObjectsRepository} - An instance to the saved objects repository
   */
  constructor(opts: StoreOpts) {
    this.callCluster = opts.callCluster;
    this.index = opts.index;
    this.taskManagerId = opts.taskManagerId;
    this.maxAttempts = opts.maxAttempts;
    this.definitions = opts.definitions;
    this.serializer = opts.serializer;
    this.savedObjectsRepository = opts.savedObjectsRepository;
    this.events$ = new Subject<TaskClaim>();
  }

  public get events(): Observable<TaskClaim> {
    return this.events$;
  }

  private emitEvents = (events: TaskClaim[]) => {
    events.forEach((event) => this.events$.next(event));
  };

  /**
   * Schedules a task.
   *
   * @param task - The task being scheduled.
   */
  public async schedule(taskInstance: TaskInstance): Promise<ConcreteTaskInstance> {
    if (!this.definitions[taskInstance.taskType]) {
      throw new Error(
        `Unsupported task type "${taskInstance.taskType}". Supported types are ${Object.keys(
          this.definitions
        ).join(', ')}`
      );
    }

    const savedObject = await this.savedObjectsRepository.create<SerializedConcreteTaskInstance>(
      'task',
      taskInstanceToAttributes(taskInstance),
      { id: taskInstance.id, refresh: false }
    );

    return savedObjectToConcreteTaskInstance(savedObject);
  }

  /**
   * Fetches a list of scheduled tasks with default sorting.
   *
   * @param opts - The query options used to filter tasks
   */
  public async fetch({ sort = [{ 'task.runAt': 'asc' }], ...opts }: SearchOpts = {}): Promise<
    FetchResult
  > {
    return this.search({
      ...opts,
      sort,
    });
  }

  /**
   * Claims available tasks from the index, which are ready to be run.
   * - runAt is now or past
   * - is not currently claimed by any instance of Kibana
   * - has a type that is in our task definitions
   *
   * @param {OwnershipClaimingOpts} options
   * @returns {Promise<ClaimOwnershipResult>}
   */
  public claimAvailableTasks = async ({
    claimOwnershipUntil,
    claimTasksById = [],
    size,
  }: OwnershipClaimingOpts): Promise<ClaimOwnershipResult> => {
    const claimTasksByIdWithRawIds = claimTasksById.map((id) =>
      this.serializer.generateRawId(undefined, 'task', id)
    );

    const numberOfTasksClaimed = await this.markAvailableTasksAsClaimed(
      claimOwnershipUntil,
      claimTasksByIdWithRawIds,
      size
    );
    const docs =
      numberOfTasksClaimed > 0
        ? await this.sweepForClaimedTasks(claimTasksByIdWithRawIds, size)
        : [];

    // emit success/fail events for claimed tasks by id
    if (claimTasksById && claimTasksById.length) {
      this.emitEvents(docs.map((doc) => asTaskClaimEvent(doc.id, asOk(doc))));

      this.emitEvents(
        difference(
          claimTasksById,
          docs.map((doc) => doc.id)
        ).map((id) => asTaskClaimEvent(id, asErr(new Error(`failed to claim task '${id}'`))))
      );
    }

    return {
      claimedTasks: numberOfTasksClaimed,
      docs,
    };
  };

  private async markAvailableTasksAsClaimed(
    claimOwnershipUntil: OwnershipClaimingOpts['claimOwnershipUntil'],
    claimTasksById: OwnershipClaimingOpts['claimTasksById'],
    size: OwnershipClaimingOpts['size']
  ): Promise<number> {
    const queryForScheduledTasks = mustBeAllOf(
      // Either a task with idle status and runAt <= now or
      // status running or claiming with a retryAt <= now.
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
      // Either task has a schedule or the attempts < the maximum configured
      shouldBeOneOf<ExistsFilter | TermFilter | RangeFilter>(
        TaskWithSchedule,
        ...Object.entries(this.definitions).map(([type, { maxAttempts }]) =>
          taskWithLessThanMaxAttempts(type, maxAttempts || this.maxAttempts)
        )
      )
    );

    const apmTrans = apm.startTransaction(`taskManager markAvailableTasksAsClaimed`, 'taskManager');
    const { updated } = await this.updateByQuery(
      asUpdateByQuery({
        query: matchesClauses(
          mustBeAllOf(
            claimTasksById && claimTasksById.length
              ? asPinnedQuery(claimTasksById, queryForScheduledTasks)
              : queryForScheduledTasks
          ),
          filterDownBy(InactiveTasks)
        ),
        update: updateFields({
          ownerId: this.taskManagerId,
          status: 'claiming',
          retryAt: claimOwnershipUntil,
        }),
        sort: [
          // sort by score first, so the "pinned" Tasks are first
          '_score',
          // the nsort by other fields
          SortByRunAtAndRetryAt,
        ],
      }),
      {
        max_docs: size,
      }
    );

    if (apmTrans) apmTrans.end();
    return updated;
  }

  /**
   * Fetches tasks from the index, which are owned by the current Kibana instance
   */
  private async sweepForClaimedTasks(
    claimTasksById: OwnershipClaimingOpts['claimTasksById'],
    size: OwnershipClaimingOpts['size']
  ): Promise<ConcreteTaskInstance[]> {
    const claimedTasksQuery = tasksClaimedByOwner(this.taskManagerId);
    const { docs } = await this.search({
      query:
        claimTasksById && claimTasksById.length
          ? asPinnedQuery(claimTasksById, claimedTasksQuery)
          : claimedTasksQuery,
      size,
      sort: SortByRunAtAndRetryAt,
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
    const attributes = taskInstanceToAttributes(doc);
    const updatedSavedObject = await this.savedObjectsRepository.update<
      SerializedConcreteTaskInstance
    >('task', doc.id, attributes, {
      refresh: false,
      version: doc.version,
    });

    return savedObjectToConcreteTaskInstance(
      // The SavedObjects update api forces a Partial on the `attributes` on the response,
      // but actually returns the whole object that is passed to it, so as we know we're
      // passing in the whole object, this is safe to do.
      // This is far from ideal, but unless we change the SavedObjectsClient this is the best we can do
      { ...updatedSavedObject, attributes: defaults(updatedSavedObject.attributes, attributes) }
    );
  }

  /**
   * Removes the specified task from the index.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  public async remove(id: string): Promise<void> {
    await this.savedObjectsRepository.delete('task', id);
  }

  /**
   * Gets a task by id
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  public async get(id: string): Promise<ConcreteTaskInstance> {
    return savedObjectToConcreteTaskInstance(await this.savedObjectsRepository.get('task', id));
  }

  /**
   * Gets task lifecycle step by id
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  public async getLifecycle(id: string): Promise<TaskLifecycle> {
    try {
      const task = await this.get(id);
      return task.status;
    } catch (err) {
      if (err.output && err.output.statusCode === 404) {
        return TaskLifecycleResult.NotFound;
      }
      throw err;
    }
  }

  private async search(opts: SearchOpts = {}): Promise<FetchResult> {
    const { query } = ensureQueryOnlyReturnsTaskObjects(opts);

    const result = await this.callCluster('search', {
      index: this.index,
      ignoreUnavailable: true,
      body: {
        ...opts,
        query,
      },
    });

    const rawDocs = (result as SearchResponse<unknown>).hits.hits;

    return {
      docs: (rawDocs as SavedObjectsRawDoc[])
        .map((doc) => this.serializer.rawToSavedObject(doc))
        .map((doc) => omit(doc, 'namespace') as SavedObject<SerializedConcreteTaskInstance>)
        .map(savedObjectToConcreteTaskInstance),
    };
  }

  private async updateByQuery(
    opts: UpdateByQuerySearchOpts = {},
    { max_docs }: UpdateByQueryOpts = {}
  ): Promise<UpdateByQueryResult> {
    const { query } = ensureQueryOnlyReturnsTaskObjects(opts);
    const result = await this.callCluster('updateByQuery', {
      index: this.index,
      ignoreUnavailable: true,
      refresh: true,
      max_docs,
      conflicts: 'proceed',
      body: {
        ...opts,
        query,
      },
    });

    const { total, updated, version_conflicts } = result as UpdateDocumentByQueryResponse;
    return {
      total,
      updated,
      version_conflicts,
    };
  }
}

function taskInstanceToAttributes(doc: TaskInstance): SerializedConcreteTaskInstance {
  return {
    ...omit(doc, 'id', 'version'),
    params: JSON.stringify(doc.params || {}),
    state: JSON.stringify(doc.state || {}),
    attempts: (doc as ConcreteTaskInstance).attempts || 0,
    scheduledAt: (doc.scheduledAt || new Date()).toISOString(),
    startedAt: (doc.startedAt && doc.startedAt.toISOString()) || null,
    retryAt: (doc.retryAt && doc.retryAt.toISOString()) || null,
    runAt: (doc.runAt || new Date()).toISOString(),
    status: (doc as ConcreteTaskInstance).status || 'idle',
  } as SerializedConcreteTaskInstance;
}

export function savedObjectToConcreteTaskInstance(
  savedObject: Omit<SavedObject<SerializedConcreteTaskInstance>, 'references'>
): ConcreteTaskInstance {
  return {
    ...savedObject.attributes,
    id: savedObject.id,
    version: savedObject.version,
    scheduledAt: new Date(savedObject.attributes.scheduledAt),
    runAt: new Date(savedObject.attributes.runAt),
    startedAt: savedObject.attributes.startedAt ? new Date(savedObject.attributes.startedAt) : null,
    retryAt: savedObject.attributes.retryAt ? new Date(savedObject.attributes.retryAt) : null,
    state: parseJSONField(savedObject.attributes.state, 'state', savedObject.id),
    params: parseJSONField(savedObject.attributes.params, 'params', savedObject.id),
  };
}

function parseJSONField(json: string, fieldName: string, id: string) {
  try {
    return json ? JSON.parse(json) : {};
  } catch (error) {
    throw new Error(`Task "${id}"'s ${fieldName} field has invalid JSON: ${json}`);
  }
}

function ensureQueryOnlyReturnsTaskObjects(opts: SearchOpts): SearchOpts {
  const originalQuery = opts.query;
  const queryOnlyTasks = { term: { type: 'task' } };
  const query = originalQuery
    ? { bool: { must: [queryOnlyTasks, originalQuery] } }
    : queryOnlyTasks;

  return {
    ...opts,
    query,
  };
}
