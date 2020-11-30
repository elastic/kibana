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
import { omit, difference, partition, map, defaults } from 'lodash';

import { some, none } from 'fp-ts/lib/Option';

import { SearchResponse, UpdateDocumentByQueryResponse } from 'elasticsearch';
import {
  SavedObject,
  SavedObjectsSerializer,
  SavedObjectsRawDoc,
  ISavedObjectsRepository,
  SavedObjectsUpdateResponse,
  ElasticsearchClient,
} from '../../../../src/core/server';

import { asOk, asErr, Result } from './lib/result_type';

import {
  ConcreteTaskInstance,
  TaskInstance,
  TaskLifecycle,
  TaskLifecycleResult,
  SerializedConcreteTaskInstance,
  TaskStatus,
} from './task';

import { TaskClaim, asTaskClaimEvent } from './task_events';

import {
  asUpdateByQuery,
  shouldBeOneOf,
  mustBeAllOf,
  filterDownBy,
  asPinnedQuery,
  matchesClauses,
  SortOptions,
} from './queries/query_clauses';

import {
  updateFieldsAndMarkAsFailed,
  IdleTaskWithExpiredRunAt,
  InactiveTasks,
  RunningOrClaimingTaskWithExpiredRetryAt,
  SortByRunAtAndRetryAt,
  tasksClaimedByOwner,
} from './queries/mark_available_tasks_as_claimed';
import { TaskTypeDictionary } from './task_type_dictionary';

import { ESSearchResponse, ESSearchBody } from '../../../typings/elasticsearch';

export interface StoreOpts {
  esClient: ElasticsearchClient;
  index: string;
  taskManagerId: string;
  maxAttempts: number;
  definitions: TaskTypeDictionary;
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

export type AggregationOpts = Pick<Required<ESSearchBody>, 'aggs'> &
  Pick<ESSearchBody, 'query' | 'size'>;

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

export type BulkUpdateResult = Result<
  ConcreteTaskInstance,
  { entity: ConcreteTaskInstance; error: Error }
>;

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
  public readonly errors$ = new Subject<Error>();

  private esClient: ElasticsearchClient;
  private definitions: TaskTypeDictionary;
  private savedObjectsRepository: ISavedObjectsRepository;
  private serializer: SavedObjectsSerializer;
  private events$: Subject<TaskClaim>;

  /**
   * Constructs a new TaskStore.
   * @param {StoreOpts} opts
   * @prop {esClient} esClient - An elasticsearch client
   * @prop {string} index - The name of the task manager index
   * @prop {number} maxAttempts - The maximum number of attempts before a task will be abandoned
   * @prop {TaskDefinition} definition - The definition of the task being run
   * @prop {serializer} - The saved object serializer
   * @prop {savedObjectsRepository} - An instance to the saved objects repository
   */
  constructor(opts: StoreOpts) {
    this.esClient = opts.esClient;
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
    this.definitions.ensureHas(taskInstance.taskType);

    let savedObject;
    try {
      savedObject = await this.savedObjectsRepository.create<SerializedConcreteTaskInstance>(
        'task',
        taskInstanceToAttributes(taskInstance),
        { id: taskInstance.id, refresh: false }
      );
    } catch (e) {
      this.errors$.next(e);
      throw e;
    }

    return savedObjectToConcreteTaskInstance(savedObject);
  }

  /**
   * Fetches a list of scheduled tasks with default sorting.
   *
   * @param opts - The query options used to filter tasks
   */
  public async fetch({
    sort = [{ 'task.runAt': 'asc' }],
    ...opts
  }: SearchOpts = {}): Promise<FetchResult> {
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

    const [documentsReturnedById, documentsClaimedBySchedule] = partition(docs, (doc) =>
      claimTasksById.includes(doc.id)
    );

    const [documentsClaimedById, documentsRequestedButNotClaimed] = partition(
      documentsReturnedById,
      // we filter the schduled tasks down by status is 'claiming' in the esearch,
      // but we do not apply this limitation on tasks claimed by ID so that we can
      // provide more detailed error messages when we fail to claim them
      (doc) => doc.status === TaskStatus.Claiming
    );

    const documentsRequestedButNotReturned = difference(
      claimTasksById,
      map(documentsReturnedById, 'id')
    );

    this.emitEvents([
      ...documentsClaimedById.map((doc) => asTaskClaimEvent(doc.id, asOk(doc))),
      ...documentsClaimedBySchedule.map((doc) => asTaskClaimEvent(doc.id, asOk(doc))),
      ...documentsRequestedButNotClaimed.map((doc) => asTaskClaimEvent(doc.id, asErr(some(doc)))),
      ...documentsRequestedButNotReturned.map((id) => asTaskClaimEvent(id, asErr(none))),
    ]);

    return {
      claimedTasks: documentsClaimedById.length + documentsClaimedBySchedule.length,
      docs: docs.filter((doc) => doc.status === TaskStatus.Claiming),
    };
  };

  private async markAvailableTasksAsClaimed(
    claimOwnershipUntil: OwnershipClaimingOpts['claimOwnershipUntil'],
    claimTasksById: OwnershipClaimingOpts['claimTasksById'],
    size: OwnershipClaimingOpts['size']
  ): Promise<number> {
    const taskMaxAttempts = [...this.definitions].reduce((accumulator, [type, { maxAttempts }]) => {
      return { ...accumulator, [type]: maxAttempts || this.maxAttempts };
    }, {});
    const queryForScheduledTasks = mustBeAllOf(
      // Either a task with idle status and runAt <= now or
      // status running or claiming with a retryAt <= now.
      shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt)
    );

    // The documents should be sorted by runAt/retryAt, unless there are pinned
    // tasks being queried, in which case we want to sort by score first, and then
    // the runAt/retryAt.  That way we'll get the pinned tasks first.  Note that
    // the score seems to favor newer documents rather than older documents, so
    // if there are not pinned tasks being queried, we do NOT want to sort by score
    // at all, just by runAt/retryAt.
    const sort: SortOptions = [SortByRunAtAndRetryAt];
    if (claimTasksById && claimTasksById.length) {
      sort.unshift('_score');
    }

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
        update: updateFieldsAndMarkAsFailed(
          {
            ownerId: this.taskManagerId,
            retryAt: claimOwnershipUntil,
          },
          claimTasksById || [],
          taskMaxAttempts
        ),
        sort,
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

    let updatedSavedObject;
    try {
      updatedSavedObject = await this.savedObjectsRepository.update<SerializedConcreteTaskInstance>(
        'task',
        doc.id,
        attributes,
        {
          refresh: false,
          version: doc.version,
        }
      );
    } catch (e) {
      this.errors$.next(e);
      throw e;
    }

    return savedObjectToConcreteTaskInstance(
      // The SavedObjects update api forces a Partial on the `attributes` on the response,
      // but actually returns the whole object that is passed to it, so as we know we're
      // passing in the whole object, this is safe to do.
      // This is far from ideal, but unless we change the SavedObjectsClient this is the best we can do
      { ...updatedSavedObject, attributes: defaults(updatedSavedObject.attributes, attributes) }
    );
  }

  /**
   * Updates the specified docs in the index, returning the docs
   * with their versions up to date.
   *
   * @param {Array<TaskDoc>} docs
   * @returns {Promise<Array<TaskDoc>>}
   */
  public async bulkUpdate(docs: ConcreteTaskInstance[]): Promise<BulkUpdateResult[]> {
    const attributesByDocId = docs.reduce((attrsById, doc) => {
      attrsById.set(doc.id, taskInstanceToAttributes(doc));
      return attrsById;
    }, new Map());

    let updatedSavedObjects: Array<SavedObjectsUpdateResponse | Error>;
    try {
      ({
        saved_objects: updatedSavedObjects,
      } = await this.savedObjectsRepository.bulkUpdate<SerializedConcreteTaskInstance>(
        docs.map((doc) => ({
          type: 'task',
          id: doc.id,
          options: { version: doc.version },
          attributes: attributesByDocId.get(doc.id)!,
        })),
        {
          refresh: false,
        }
      ));
    } catch (e) {
      this.errors$.next(e);
      throw e;
    }

    return updatedSavedObjects.map<BulkUpdateResult>((updatedSavedObject, index) =>
      isSavedObjectsUpdateResponse(updatedSavedObject)
        ? asOk(
            savedObjectToConcreteTaskInstance({
              ...updatedSavedObject,
              attributes: defaults(
                updatedSavedObject.attributes,
                attributesByDocId.get(updatedSavedObject.id)!
              ),
            })
          )
        : asErr({
            // The SavedObjectsRepository maintains the order of the docs
            // so we can rely on the index in the `docs` to match an error
            // on the same index in the `bulkUpdate` result
            entity: docs[index],
            error: updatedSavedObject,
          })
    );
  }

  /**
   * Removes the specified task from the index.
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  public async remove(id: string): Promise<void> {
    try {
      await this.savedObjectsRepository.delete('task', id);
    } catch (e) {
      this.errors$.next(e);
      throw e;
    }
  }

  /**
   * Gets a task by id
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  public async get(id: string): Promise<ConcreteTaskInstance> {
    let result;
    try {
      result = await this.savedObjectsRepository.get<SerializedConcreteTaskInstance>('task', id);
    } catch (e) {
      this.errors$.next(e);
      throw e;
    }
    return savedObjectToConcreteTaskInstance(result);
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

    try {
      const {
        body: {
          hits: { hits: tasks },
        },
      } = await this.esClient.search<SearchResponse<SavedObjectsRawDoc['_source']>>({
        index: this.index,
        ignore_unavailable: true,
        body: {
          ...opts,
          query,
        },
      });

      return {
        docs: tasks
          .filter((doc) => this.serializer.isRawSavedObject(doc))
          .map((doc) => this.serializer.rawToSavedObject(doc))
          .map((doc) => omit(doc, 'namespace') as SavedObject<SerializedConcreteTaskInstance>)
          .map(savedObjectToConcreteTaskInstance),
      };
    } catch (e) {
      this.errors$.next(e);
      throw e;
    }
  }

  public async aggregate<TSearchRequest extends AggregationOpts>({
    aggs,
    query,
    size = 0,
  }: TSearchRequest): Promise<ESSearchResponse<ConcreteTaskInstance, { body: TSearchRequest }>> {
    const { body } = await this.esClient.search<
      ESSearchResponse<ConcreteTaskInstance, { body: TSearchRequest }>
    >({
      index: this.index,
      ignore_unavailable: true,
      body: ensureAggregationOnlyReturnsTaskObjects({
        query,
        aggs,
        size,
      }),
    });
    return body;
  }

  private async updateByQuery(
    opts: UpdateByQuerySearchOpts = {},
    // eslint-disable-next-line @typescript-eslint/naming-convention
    { max_docs }: UpdateByQueryOpts = {}
  ): Promise<UpdateByQueryResult> {
    const { query } = ensureQueryOnlyReturnsTaskObjects(opts);
    try {
      const {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        body: { total, updated, version_conflicts },
      } = await this.esClient.updateByQuery<UpdateDocumentByQueryResponse>({
        index: this.index,
        ignore_unavailable: true,
        refresh: true,
        max_docs,
        conflicts: 'proceed',
        body: {
          ...opts,
          query,
        },
      });

      return {
        total,
        updated,
        version_conflicts,
      };
    } catch (e) {
      this.errors$.next(e);
      throw e;
    }
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

function ensureAggregationOnlyReturnsTaskObjects(opts: AggregationOpts): AggregationOpts {
  const originalQuery = opts.query;
  const filterToOnlyTasks = {
    bool: {
      filter: [{ term: { type: 'task' } }],
    },
  };
  const query = originalQuery
    ? { bool: { must: [filterToOnlyTasks, originalQuery] } }
    : filterToOnlyTasks;
  return {
    ...opts,
    query,
  };
}

function isSavedObjectsUpdateResponse(
  result: SavedObjectsUpdateResponse | Error
): result is SavedObjectsUpdateResponse {
  return result && typeof (result as SavedObjectsUpdateResponse).id === 'string';
}
