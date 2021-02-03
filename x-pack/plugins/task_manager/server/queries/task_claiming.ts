/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This module contains helpers for managing the task manager storage layer.
 */
import apm from 'elastic-apm-node';
import { Subject, Observable, from, of, Observer } from 'rxjs';
import { omit, difference, partition, map, defaults, groupBy, mapValues, countBy } from 'lodash';

import { some, none } from 'fp-ts/lib/Option';

import { SearchResponse, UpdateDocumentByQueryResponse } from 'elasticsearch';
import {
  SavedObject,
  SavedObjectsSerializer,
  SavedObjectsRawDoc,
  ISavedObjectsRepository,
  SavedObjectsUpdateResponse,
  ElasticsearchClient,
} from '../../../../../src/core/server';

import { asOk, asErr, Result } from '../lib/result_type';

import {
  ConcreteTaskInstance,
  TaskInstance,
  TaskLifecycle,
  TaskLifecycleResult,
  SerializedConcreteTaskInstance,
  TaskStatus,
  TaskDefinition,
} from '../task';

import { TaskClaim, asTaskClaimEvent, TaskClaimErrorType } from '../task_events';

import {
  asUpdateByQuery,
  shouldBeOneOf,
  mustBeAllOf,
  filterDownBy,
  asPinnedQuery,
  matchesClauses,
  SortOptions,
} from './query_clauses';

import {
  updateFieldsAndMarkAsFailed,
  IdleTaskWithExpiredRunAt,
  InactiveTasks,
  RunningOrClaimingTaskWithExpiredRetryAt,
  SortByRunAtAndRetryAt,
  tasksClaimedByOwner,
} from './mark_available_tasks_as_claimed';
import { TaskTypeDictionary } from '../task_type_dictionary';

import { TaskStore, UpdateByQueryResult } from '../task_store';

export interface TaskClaimingOpts {
  definitions: TaskTypeDictionary;
  taskStore: TaskStore;
  serializer: SavedObjectsSerializer;
  maxAttempts: number;
}

export interface OwnershipClaimingOpts {
  claimOwnershipUntil: Date;
  claimTasksById?: string[];
  getCapacity: (taskType?: string) => number;
}

export interface FetchResult {
  docs: ConcreteTaskInstance[];
}

export interface ClaimOwnershipResult {
  stats: {
    tasksUpdated: number;
    tasksConflicted: number;
    tasksClaimed: number;
  };
  docs: ConcreteTaskInstance[];
}

export class TaskClaiming {
  public readonly errors$ = new Subject<Error>();
  public readonly maxAttempts: number;

  private definitions: TaskTypeDictionary;
  private events$: Subject<TaskClaim>;
  private serializer: SavedObjectsSerializer;
  private taskStore: TaskStore;

  /**
   * Constructs a new TaskStore.
   * @param {TaskClaimingOpts} opts
   * @prop {number} maxAttempts - The maximum number of attempts before a task will be abandoned
   * @prop {TaskDefinition} definition - The definition of the task being run
   * @prop {serializer} - The saved object serializer
   */
  constructor(opts: TaskClaimingOpts) {
    this.definitions = opts.definitions;
    this.maxAttempts = opts.maxAttempts;
    this.serializer = opts.serializer;
    this.taskStore = opts.taskStore;
    this.events$ = new Subject<TaskClaim>();
  }

  public get events(): Observable<TaskClaim> {
    return this.events$;
  }

  private emitEvents = (events: TaskClaim[]) => {
    events.forEach((event) => this.events$.next(event));
  };

  /**
   * Claims available tasks from the index, which are ready to be run.
   * - runAt is now or past
   * - is not currently claimed by any instance of Kibana
   * - has a type that is in our task definitions
   *
   * @param {OwnershipClaimingOpts} options
   * @returns {Observable<ClaimOwnershipResult>}
   */
  public claimAvailableTasks = ({
    claimOwnershipUntil,
    claimTasksById = [],
    getCapacity,
  }: OwnershipClaimingOpts): Observable<ClaimOwnershipResult> =>
    new Observable((observer: Observer<ClaimOwnershipResult>) => {
      this.executClaimAvailableTasks({
        claimOwnershipUntil,
        claimTasksById,
        getCapacity,
      })
        .then((val) => {
          observer.next(val);
          observer.complete();
        })
        .catch((ex) => {
          observer.error(ex);
        });
    });

  private executClaimAvailableTasks = async ({
    claimOwnershipUntil,
    claimTasksById = [],
    getCapacity,
  }: OwnershipClaimingOpts): Promise<ClaimOwnershipResult> => {
    const claimTasksByIdWithRawIds = claimTasksById.map((id) =>
      this.serializer.generateRawId(undefined, 'task', id)
    );

    const size = getCapacity();

    const {
      updated: tasksUpdated,
      version_conflicts: tasksConflicted,
    } = await this.markAvailableTasksAsClaimed({
      claimOwnershipUntil,
      claimTasksById: claimTasksByIdWithRawIds,
      size,
      taskTypes: new Set(this.definitions.getAllTypes()),
    });

    const docs =
      tasksUpdated > 0 ? await this.sweepForClaimedTasks(claimTasksByIdWithRawIds, size) : [];

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
      ...documentsRequestedButNotClaimed.map((doc) =>
        asTaskClaimEvent(
          doc.id,
          asErr({
            task: some(doc),
            errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_IN_CLAIMING_STATUS,
          })
        )
      ),
      ...documentsRequestedButNotReturned.map((id) =>
        asTaskClaimEvent(
          id,
          asErr({ task: none, errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_RETURNED })
        )
      ),
    ]);

    return {
      stats: {
        tasksUpdated,
        tasksConflicted,
        tasksClaimed: documentsClaimedById.length + documentsClaimedBySchedule.length,
      },
      docs: docs.filter((doc) => doc.status === TaskStatus.Claiming),
    };
  };

  /**
   * Claims available tasks from the index, which are ready to be run.
   * - runAt is now or past
   * - is not currently claimed by any instance of Kibana
   * - has a type that is in our task definitions
   *
   * @param {OwnershipClaimingOpts} options
   * @returns {Promise<ClaimOwnershipResult>}
   */
  public claimAvailableTasks2 = async ({
    claimOwnershipUntil,
    claimTasksById = [],
    getCapacity,
  }: OwnershipClaimingOpts): Promise<ClaimOwnershipResult> => {
    const claimTasksByIdWithRawIds = claimTasksById.map((id) =>
      this.serializer.generateRawId(undefined, 'task', id)
    );

    const {
      limitedConcurrency,
      unlimitedConcurrency,
    } = groupBy(this.definitions.getAllDefinitions(), (definition) =>
      definition.maxConcurrency ? 'limitedConcurrency' : 'unlimitedConcurrency'
    );

    const getPollerFor = (definition: TaskDefinition, taskTypes?: string[]) => async (
      precedingQueryResult: UpdateByQueryResult
    ): Promise<UpdateByQueryResult> => {
      const capacity = getCapacity() - precedingQueryResult.updated;
      const typedCapacity = Math.min(capacity, getCapacity(definition.type));
      // if we have no more capacity, short circuit here
      if (typedCapacity <= 0) {
        return precedingQueryResult;
      }
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { updated, version_conflicts, total } = await this.markAvailableTasksAsClaimed({
        claimOwnershipUntil,
        claimTasksById: claimTasksByIdWithRawIds.splice(0, typedCapacity),
        size: typedCapacity,
        taskTypes: new Set(taskTypes ? taskTypes : [definition.type]),
      });
      return {
        updated: updated + precedingQueryResult.updated,
        version_conflicts: version_conflicts + precedingQueryResult.version_conflicts,
        total: total + precedingQueryResult.total,
      };
    };

    const defaultPoller = getPollerFor(
      unlimitedConcurrency[0],
      unlimitedConcurrency.map((d) => d.type)
    );
    /**
     * For Monday
     * The reason RunNow is broken is that when we had one query we could
     * prioritize the RunNow task, but now that we have multiple pollers
     * we might use up all our workers on the first poller, and none will be
     * left for the one that is needed for the runNow
     * You;'ll have to identify the poller for the runNow and run it first
     * but what happens when you have two runNows that came in? What if
     * they require different pollers?
     * Sucks.
     *
     * Another issue-
     * This means if we pick up tasks in the first claim we won't start running them
     * until after the last claim... that's sucks.
     * We should make this reactive.... release tasks as they come in and close the stream
     * once the last claim completes
     *
     * might be time to extract `claimAvailableTasks` from Task Store by making
     * updateByQuery a public method and moving the stuff before it to its own module
     * easier to test and all....
     *
     *
     * What happens if someone uses RunNow on a limited concurrency task?
     * We need to ensure we never have more than the limit running and return a suitable error if we
     * accidentally claim one that can't be ran
     */
    const {
      updated: tasksUpdated,
      version_conflicts: tasksConflicted,
    } = await /* shuffle*/ (limitedConcurrency
      ? [defaultPoller, ...limitedConcurrency.map((definition) => getPollerFor(definition))]
      : [defaultPoller]
    ).reduce(
      async (precedingQueryResult, concatPoller) => concatPoller(await precedingQueryResult),
      Promise.resolve({
        updated: 0,
        version_conflicts: 0,
        total: 0,
      })
    );

    const docs =
      tasksUpdated > 0
        ? await this.sweepForClaimedTasks(claimTasksByIdWithRawIds, getCapacity())
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

    // This means we take the tasks that were claimed by their ID and count them by their type
    const remainingCapacityOfClaimByIdByType = mapValues(
      countBy(documentsClaimedById, (doc) => doc.taskType),
      (count, type) => getCapacity(type) - count
    );

    const [documentsClaimedByIdWithinCapacity, documentsClaimedByIdOutOfCapacity] = partition(
      documentsClaimedById,
      (doc) => {
        // if we've exceeded capacity, we reject this task
        if (remainingCapacityOfClaimByIdByType[doc.taskType] < 0) {
          // as we're rejecting this task we can inc the count so that we know
          // to keep the next one returned by ID of the same type
          remainingCapacityOfClaimByIdByType[doc.taskType]++;
          return false;
        }
        return true;
      }
    );

    const documentsRequestedButNotReturned = difference(
      claimTasksById,
      map(documentsReturnedById, 'id')
    );

    // TODO - reschedule all tasks in `documentsClaimedByIdOutOfCapacity`

    this.emitEvents([
      ...documentsClaimedByIdWithinCapacity.map((doc) => asTaskClaimEvent(doc.id, asOk(doc))),
      ...documentsClaimedByIdOutOfCapacity.map((doc) =>
        asTaskClaimEvent(
          doc.id,
          asErr({
            task: some(doc),
            errorType: TaskClaimErrorType.CLAIMED_BY_ID_OUT_OF_CAPACITY,
          })
        )
      ),
      ...documentsClaimedBySchedule.map((doc) => asTaskClaimEvent(doc.id, asOk(doc))),
      ...documentsRequestedButNotClaimed.map((doc) =>
        asTaskClaimEvent(
          doc.id,
          asErr({
            task: some(doc),
            errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_IN_CLAIMING_STATUS,
          })
        )
      ),
      ...documentsRequestedButNotReturned.map((id) =>
        asTaskClaimEvent(
          id,
          asErr({ task: none, errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_RETURNED })
        )
      ),
    ]);

    return {
      stats: {
        tasksUpdated,
        tasksConflicted,
        tasksClaimed: documentsClaimedById.length + documentsClaimedBySchedule.length,
      },
      docs: docs.filter((doc) => doc.status === TaskStatus.Claiming),
    };
  };

  private async markAvailableTasksAsClaimed({
    claimOwnershipUntil,
    claimTasksById,
    size,
    taskTypes,
  }: Omit<OwnershipClaimingOpts, 'getCapacity'> & {
    size: number;
    taskTypes: Set<string>;
  }): Promise<UpdateByQueryResult> {
    const { taskTypesToSkip = [], taskTypesToClaim = [] } = groupBy(
      [...this.definitions],
      ([type]) => (taskTypes.has(type) ? 'taskTypesToClaim' : 'taskTypesToSkip')
    );
    const taskMaxAttempts = taskTypesToClaim.reduce((accumulator, [type, { maxAttempts }]) => {
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
    const result = await this.taskStore.updateByQuery(
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
            ownerId: this.taskStore.taskManagerId,
            retryAt: claimOwnershipUntil,
          },
          claimTasksById || [],
          [...taskTypes],
          taskTypesToSkip.map(([type]) => type),
          taskMaxAttempts
        ),
        sort,
      }),
      {
        max_docs: size,
      }
    );

    if (apmTrans) apmTrans.end();
    return result;
  }

  /**
   * Fetches tasks from the index, which are owned by the current Kibana instance
   */
  private async sweepForClaimedTasks(
    claimTasksById: OwnershipClaimingOpts['claimTasksById'],
    size: number
  ): Promise<ConcreteTaskInstance[]> {
    const claimedTasksQuery = tasksClaimedByOwner(this.taskStore.taskManagerId);
    const { docs } = await this.taskStore.fetch({
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
}
