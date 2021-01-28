/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { combineLatest, Observable, Subject } from 'rxjs';
import { first, map, distinctUntilChanged } from 'rxjs/operators';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  Logger,
  CoreStart,
  ServiceStatusLevels,
  CoreStatus,
} from '../../../../src/core/server';
import { TaskDefinition } from './task';
import { TaskPollingLifecycle } from './polling_lifecycle';
import { TaskManagerConfig } from './config';
import { createInitialMiddleware, addMiddlewareToChain, Middleware } from './lib/middleware';
import { removeIfExists } from './lib/remove_if_exists';
import { setupSavedObjects } from './saved_objects';
import { TaskTypeDictionary } from './task_type_dictionary';
import { FetchResult, SearchOpts, TaskStore } from './task_store';
import { createManagedConfiguration } from './lib/create_managed_configuration';
import { TaskScheduling } from './task_scheduling';
import { healthRoute } from './routes';
import { createMonitoringStats, MonitoringStats } from './monitoring';

export type TaskManagerSetupContract = { addMiddleware: (middleware: Middleware) => void } & Pick<
  TaskTypeDictionary,
  'registerTaskDefinitions'
>;

export type TaskManagerStartContract = Pick<
  TaskScheduling,
  'schedule' | 'runNow' | 'ensureScheduled'
> &
  Pick<TaskStore, 'fetch' | 'get' | 'remove'> & {
    removeIfExists: TaskStore['remove'];
  };

export class TaskManagerPlugin
  implements Plugin<TaskManagerSetupContract, TaskManagerStartContract> {
  private taskPollingLifecycle?: TaskPollingLifecycle;
  private taskManagerId?: string;
  private config?: TaskManagerConfig;
  private logger: Logger;
  private definitions: TaskTypeDictionary;
  private middleware: Middleware = createInitialMiddleware();
  private elasticsearchAndSOAvailability$?: Observable<boolean>;
  private monitoringStats$ = new Subject<MonitoringStats>();

  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
    this.logger = initContext.logger.get();
    this.definitions = new TaskTypeDictionary(this.logger);
  }

  public async setup(core: CoreSetup): Promise<TaskManagerSetupContract> {
    this.config = await this.initContext.config
      .create<TaskManagerConfig>()
      .pipe(first())
      .toPromise();

    this.elasticsearchAndSOAvailability$ = getElasticsearchAndSOAvailability(core.status.core$);

    setupSavedObjects(core.savedObjects, this.config);
    this.taskManagerId = this.initContext.env.instanceUuid;

    if (!this.taskManagerId) {
      this.logger.error(
        `TaskManager is unable to start as there the Kibana UUID is invalid (value of the "server.uuid" configuration is ${this.taskManagerId})`
      );
      throw new Error(`TaskManager is unable to start as Kibana has no valid UUID assigned to it.`);
    } else {
      this.logger.info(`TaskManager is identified by the Kibana UUID: ${this.taskManagerId}`);
    }

    // Routes
    const router = core.http.createRouter();
    const serviceStatus$ = healthRoute(
      router,
      this.monitoringStats$,
      this.logger,
      this.taskManagerId,
      this.config!
    );

    core.getStartServices().then(async () => {
      core.status.set(
        combineLatest([core.status.derivedStatus$, serviceStatus$]).pipe(
          map(([derivedStatus, serviceStatus]) =>
            serviceStatus.level > derivedStatus.level ? serviceStatus : derivedStatus
          )
        )
      );
    });

    return {
      addMiddleware: (middleware: Middleware) => {
        this.assertStillInSetup('add Middleware');
        this.middleware = addMiddlewareToChain(this.middleware, middleware);
      },
      registerTaskDefinitions: (taskDefinition: Record<string, TaskDefinition>) => {
        this.assertStillInSetup('register task definitions');
        this.definitions.registerTaskDefinitions(taskDefinition);
      },
    };
  }

  public start({ savedObjects, elasticsearch }: CoreStart): TaskManagerStartContract {
    const savedObjectsRepository = savedObjects.createInternalRepository(['task']);

    const taskStore = new TaskStore({
      serializer: savedObjects.createSerializer(),
      savedObjectsRepository,
      esClient: elasticsearch.createClient('taskManager').asInternalUser,
      index: this.config!.index,
      maxAttempts: this.config!.max_attempts,
      definitions: this.definitions,
      taskManagerId: `kibana:${this.taskManagerId!}`,
    });

    const managedConfiguration = createManagedConfiguration({
      logger: this.logger,
      errors$: taskStore.errors$,
      startingMaxWorkers: this.config!.max_workers,
      startingPollInterval: this.config!.poll_interval,
    });

    this.taskPollingLifecycle = new TaskPollingLifecycle({
      config: this.config!,
      definitions: this.definitions,
      logger: this.logger,
      taskStore,
      middleware: this.middleware,
      elasticsearchAndSOAvailability$: this.elasticsearchAndSOAvailability$!,
      ...managedConfiguration,
    });

    createMonitoringStats(
      this.taskPollingLifecycle,
      taskStore,
      this.elasticsearchAndSOAvailability$!,
      this.config!,
      managedConfiguration,
      this.logger
    ).subscribe((stat) => this.monitoringStats$.next(stat));

    const taskScheduling = new TaskScheduling({
      logger: this.logger,
      taskStore,
      middleware: this.middleware,
      taskPollingLifecycle: this.taskPollingLifecycle,
    });

    return {
      fetch: (opts: SearchOpts): Promise<FetchResult> => taskStore.fetch(opts),
      get: (id: string) => taskStore.get(id),
      remove: (id: string) => taskStore.remove(id),
      removeIfExists: (id: string) => removeIfExists(taskStore, id),
      schedule: (...args) => taskScheduling.schedule(...args),
      ensureScheduled: (...args) => taskScheduling.ensureScheduled(...args),
      runNow: (...args) => taskScheduling.runNow(...args),
    };
  }

  /**
   * Ensures task manager hasn't started
   *
   * @param {string} the name of the operation being executed
   * @returns void
   */
  private assertStillInSetup(operation: string) {
    if (this.taskPollingLifecycle?.isStarted) {
      throw new Error(`Cannot ${operation} after the task manager has started`);
    }
  }
}

export function getElasticsearchAndSOAvailability(
  core$: Observable<CoreStatus>
): Observable<boolean> {
  return core$.pipe(
    map(
      ({ elasticsearch, savedObjects }) =>
        elasticsearch.level === ServiceStatusLevels.available &&
        savedObjects.level === ServiceStatusLevels.available
    ),
    distinctUntilChanged()
  );
}
