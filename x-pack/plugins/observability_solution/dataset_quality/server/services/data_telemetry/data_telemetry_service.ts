/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  from,
  defer,
  delay,
  tap,
  exhaustMap,
  switchMap,
  map,
  of,
  firstValueFrom,
  throwError,
} from 'rxjs';
import { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';

import { TelemetryTaskState } from './types';
import { registerLogsDataUsageCollector } from './register_collector';
import {
  BREATHE_DELAY_MEDIUM,
  BREATHE_DELAY_SHORT,
  NON_LOG_SIGNALS,
  EXCLUDE_ELASTIC_LOGS,
  MAX_STREAMS_TO_REPORT,
  LOGS_DATASET_INDEX_PATTERNS,
  LOGS_DATA_TELEMETRY_TASK_TYPE,
  TELEMETRY_TASK_INTERVAL,
  LOGS_DATA_TELEMETRY_TASK_ID,
  TELEMETRY_TASK_TIMEOUT,
} from './constants';
import {
  getAllIndices,
  addMappingsToIndices,
  addNamespace,
  groupStatsByPatternName,
  getIndexBasicStats,
  indexStatsToTelemetryEvents,
  getIndexFieldStats,
} from './helpers';

const SKIP_COLLECTION = 'Skip Collection';

export class DataTelemetryService {
  private readonly logger: Logger;

  private taskManagerStart?: TaskManagerStartContract;
  private telemetryStart?: TelemetryPluginStart;

  private usageCollection?: UsageCollectionSetup;

  private isOptedIn?: boolean = true; // Assume true until the first check
  private esClient?: ElasticsearchClient;

  private isStopped = false;
  private isInProgress = false;

  private run$ = defer(() => from(this.shouldCollectTelemetry())).pipe(
    switchMap((isOptedIn) => {
      // If stopped, do not proceed
      if (this.isStopped) {
        return this.throwSkipCollection();
      }

      return of(isOptedIn);
    }),
    tap((isOptedIn) => {
      if (!isOptedIn) {
        this.logTelemetryNotOptedIn();
        this.isInProgress = false;
      } else {
        this.isInProgress = true;
      }
    }),
    switchMap((isOptedIn) => {
      // If not opted in, do not proceed
      if (!isOptedIn) {
        return this.throwSkipCollection();
      }

      return of(isOptedIn);
    }),
    exhaustMap(() => {
      return this.collectTelemetryData();
    }),
    tap(() => (this.isInProgress = false))
  );

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public setup(taskManagerSetup: TaskManagerSetupContract, usageCollection?: UsageCollectionSetup) {
    this.usageCollection = usageCollection;

    if (usageCollection) {
      // Register Kibana task
      this.registerTask(taskManagerSetup);
    } else {
      this.logger.warn(
        `[Logs Data Telemetry] Usage collection service is not available: cannot collect telemetry data`
      );
    }
  }

  public async start(
    telemetryStart: TelemetryPluginStart,
    core: CoreStart,
    taskManagerStart: TaskManagerStartContract
  ) {
    this.taskManagerStart = taskManagerStart;
    this.telemetryStart = telemetryStart;
    this.esClient = core?.elasticsearch.client.asInternalUser;

    if (taskManagerStart && this.usageCollection) {
      const taskInstance = await this.scheduleTask(taskManagerStart);
      if (taskInstance) {
        this.logger.debug(`Task ${taskInstance.id} scheduled.`);
      }

      // Create and register usage collector for logs data telemetry
      registerLogsDataUsageCollector(this.usageCollection, this.getCollectorOptions());
    }
  }

  public stop() {
    this.isStopped = true;
  }

  public resume() {
    this.isStopped = false;
  }

  private registerTask(taskManager: TaskManagerSetupContract) {
    const service = this;
    taskManager.registerTaskDefinitions({
      [LOGS_DATA_TELEMETRY_TASK_TYPE]: {
        title: 'Logs Data Telemetry',
        description:
          'This task collects data telemetry for logs data and sends it to the telemetry service via usage collector plugin.',
        timeout: `${TELEMETRY_TASK_TIMEOUT}m`,
        maxAttempts: 1, // Do not retry

        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            // Perform the work of the task. The return value should fit the TaskResult interface.
            async run() {
              const { state } = taskInstance;
              let data = state?.data ?? null;

              try {
                data = await firstValueFrom(service.run$);
              } catch (e) {
                if (e.message === SKIP_COLLECTION) {
                  data = null; // Collection is skipped, skip reporting
                } else {
                  service.logger.error(e);
                }
              }

              return {
                state: { ran: true, data },
              };
            },
            async cancel() {
              service.logger.warn(`[Logs Data Telemetry] Task cancelled`);
            },
          };
        },
      },
    });
  }

  private async scheduleTask(taskManager: TaskManagerStartContract): Promise<TaskInstance | null> {
    try {
      const taskInstance = await taskManager.ensureScheduled({
        id: LOGS_DATA_TELEMETRY_TASK_ID,
        taskType: LOGS_DATA_TELEMETRY_TASK_TYPE,
        schedule: {
          interval: `${TELEMETRY_TASK_INTERVAL}m`,
        },
        params: {},
        state: {},
        scope: ['logs'],
      });

      this.logger?.debug(
        `Task ${LOGS_DATA_TELEMETRY_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}.`
      );

      return taskInstance;
    } catch (e) {
      this.logger?.error(
        `Failed to schedule task ${LOGS_DATA_TELEMETRY_TASK_ID} with interval ${TELEMETRY_TASK_INTERVAL}. ${e?.message}`
      );

      return null;
    }
  }

  public async shouldCollectTelemetry() {
    if (process.env.CI) {
      return false; // Telemetry collection flow should not run in CI
    }

    this.isOptedIn = await this.telemetryStart?.getIsOptedIn();
    return this.isOptedIn === true;
  }

  private collectTelemetryData() {
    // Gather data streams and indices related to each stream of log
    if (this.esClient) {
      return getAllIndices({
        esClient: this.esClient,
        logsIndexPatterns: LOGS_DATASET_INDEX_PATTERNS,
        excludeStreamsStartingWith: [...NON_LOG_SIGNALS, ...EXCLUDE_ELASTIC_LOGS],
        breatheDelay: BREATHE_DELAY_MEDIUM,
      }).pipe(
        switchMap((dataStreamsAndIndicesInfo) => {
          if (dataStreamsAndIndicesInfo.length > MAX_STREAMS_TO_REPORT) {
            this.logger.debug(
              `[Logs Data Telemetry] Number of data streams exceeds ${MAX_STREAMS_TO_REPORT}. Skipping telemetry collection.`
            );

            return this.throwSkipCollection();
          }

          return of(dataStreamsAndIndicesInfo);
        }),
        delay(BREATHE_DELAY_MEDIUM),
        switchMap((dataStreamsAndIndicesInfo) => {
          return addMappingsToIndices({
            esClient: this.esClient!,
            dataStreamsInfo: dataStreamsAndIndicesInfo,
            logsIndexPatterns: LOGS_DATASET_INDEX_PATTERNS,
          });
        }),
        delay(BREATHE_DELAY_SHORT),
        switchMap((dataStreamsAndIndicesInfo) => {
          return addNamespace({
            dataStreamsInfo: dataStreamsAndIndicesInfo,
          });
        }),
        delay(BREATHE_DELAY_MEDIUM),
        switchMap((infoWithNamespace) => {
          return getIndexBasicStats({
            esClient: this.esClient!,
            indices: infoWithNamespace,
            breatheDelay: BREATHE_DELAY_MEDIUM,
          });
        }),
        delay(BREATHE_DELAY_SHORT),
        switchMap((infoWithStats) => {
          return getIndexFieldStats({
            basicStats: infoWithStats,
          });
        }),
        delay(BREATHE_DELAY_SHORT),
        map((statsWithNamespace) => {
          return groupStatsByPatternName(statsWithNamespace);
        }),
        map((statsByPattern) => {
          return indexStatsToTelemetryEvents(statsByPattern);
        })
      );
    } else {
      this.logger.warn(
        `[Logs Data Telemetry] Elasticsearch client is unavailable: cannot retrieve data streams
        for stream of logs`
      );

      return this.throwSkipCollection();
    }
  }

  private getCollectorOptions() {
    return {
      fetch: async () => {
        // Retrieve the latest telemetry data from task manager
        const taskState = await this.getLatestTaskState();

        return { data: taskState.data ?? [] };
      },
      isReady: async () => {
        const taskState = await this.getLatestTaskState();

        return !this.isStopped && !this.isInProgress && taskState.ran && taskState.data !== null;
      },
    };
  }

  private async getLatestTaskState() {
    const defaultState: TelemetryTaskState = {
      data: null,
      ran: false,
    };

    if (this.taskManagerStart) {
      try {
        const fetchResult = await this.taskManagerStart.fetch({
          query: { bool: { filter: { term: { _id: `task:${LOGS_DATA_TELEMETRY_TASK_ID}` } } } },
        });

        return (fetchResult.docs[0]?.state ?? defaultState) as TelemetryTaskState;
      } catch (err) {
        const errMessage = err && err.message ? err.message : err.toString();
        if (!errMessage.includes('NotInitialized')) {
          throw err;
        }
      }
    } else {
      this.logger.error(
        `[Logs Data Telemetry] Task manager is not available: cannot retrieve latest task state`
      );
    }

    return defaultState;
  }

  private logTelemetryNotOptedIn() {
    this.logger.debug(`[Logs Data Telemetry] Telemetry is not opted-in.`);
  }

  private throwSkipCollection() {
    return throwError(() => new Error(SKIP_COLLECTION));
  }
}
