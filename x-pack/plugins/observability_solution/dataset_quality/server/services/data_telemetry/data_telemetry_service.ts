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
  filter,
  tap,
  take,
  takeWhile,
  exhaustMap,
  switchMap,
  map,
  of,
  EMPTY,
} from 'rxjs';
import type { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import {
  ConcreteTaskInstance,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/server';

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

import { DataTelemetryEvent } from './types';

export class DataTelemetryService {
  private readonly logger: Logger;
  private isStopped = false;

  private telemetryStart?: TelemetryPluginStart;

  // @ts-ignore: Unused variable
  private analytics?: AnalyticsServiceSetup;

  // @ts-ignore: Unused variable
  private isInProgress = false;

  private isOptedIn?: boolean = true; // Assume true until the first check
  private esClient?: ElasticsearchClient;

  // @ts-ignore: Unused variable
  private run$ = defer(() => from(this.isTelemetryOptedIn())).pipe(
    takeWhile(() => !this.isStopped),
    tap((isOptedIn) => {
      if (!isOptedIn) {
        this.logTelemetryNotOptedIn();
        this.isInProgress = false;
      } else {
        this.isInProgress = true;
      }
    }),
    filter((isOptedIn) => isOptedIn),
    exhaustMap(() => this.collectAndSend()),
    tap(() => (this.isInProgress = false))
  );

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public setup(analytics: AnalyticsServiceSetup, taskManager: TaskManagerSetupContract) {
    this.analytics = analytics;
    this.registerTask(taskManager);
  }

  public async start(
    telemetryStart?: TelemetryPluginStart,
    core?: CoreStart,
    taskManager?: TaskManagerStartContract
  ) {
    this.telemetryStart = telemetryStart;
    this.esClient = core?.elasticsearch.client.asInternalUser;

    if (taskManager) {
      const taskInstance = await this.scheduleTask(taskManager);
      if (taskInstance) {
        this.logger.debug(`Task ${taskInstance.id} scheduled.`);
      }
    }
  }

  public stop() {
    this.isStopped = true;
  }

  private registerTask(taskManager: TaskManagerSetupContract) {
    const service = this;
    taskManager.registerTaskDefinitions({
      [LOGS_DATA_TELEMETRY_TASK_TYPE]: {
        title: 'Logs Data Telemetry',
        description:
          'This task collects data telemetry for logs data and sends it to the telemetry service.',
        timeout: `${TELEMETRY_TASK_TIMEOUT}m`,
        maxAttempts: 1, // Do not retry

        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            // Perform the work of the task. The return value should fit the TaskResult interface.
            async run() {
              const { state } = taskInstance;
              service.logger.debug(`[Logs Data Telemetry] Running task`);

              try {
                service.run$.pipe(take(1)).subscribe({
                  complete: () => {
                    service.logger.debug(`[Logs Data Telemetry] Task completed`);
                  },
                });

                return { state };
              } catch (e) {
                service.logger.error(e);
              }

              return { state };
            },
            async cancel() {
              service.logger.debug(`[Logs Data Telemetry] Task cancelled`);
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

  public async isTelemetryOptedIn() {
    this.isOptedIn = await this.telemetryStart?.getIsOptedIn();
    return this.isOptedIn === true;
  }

  private collectAndSend() {
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
            return EMPTY;
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
        }),
        delay(BREATHE_DELAY_SHORT),
        switchMap((dataTelemetryEvents) => {
          return from(this.reportEvents(dataTelemetryEvents));
        })
      );
    } else {
      this.logger.warn(
        `[Logs Data Telemetry] Elasticsearch client is unavailable: cannot retrieve data streams
        for stream of logs`
      );

      return EMPTY;
    }
  }

  private async reportEvents(events: DataTelemetryEvent[]) {
    // TODO: Implement reporting events via analytics service
    return Promise.resolve(events);
  }

  private logTelemetryNotOptedIn() {
    this.logger.debug(`[Logs Data Telemetry] Telemetry is not opted-in.`);
  }
}
