/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Subject,
  timer,
  from,
  delay,
  filter,
  tap,
  takeUntil,
  exhaustMap,
  switchMap,
  map,
  of,
  EMPTY,
} from 'rxjs';
import type { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/server';

import {
  BREATHE_DELAY_MEDIUM,
  BREATHE_DELAY_SHORT,
  NON_LOG_SIGNALS,
  EXCLUDE_ELASTIC_LOGS,
  MAX_STREAMS_TO_REPORT,
  STARTUP_DELAY,
  TELEMETRY_INTERVAL,
  LOGS_DATASET_INDEX_PATTERNS,
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
  private readonly stop$ = new Subject<void>();

  private telemetryStart?: TelemetryPluginStart;

  // @ts-ignore: Unused variable
  private analytics?: AnalyticsServiceSetup;

  // @ts-ignore: Unused variable
  private isInProgress = false;

  private isOptedIn?: boolean = true; // Assume true until the first check
  private esClient?: ElasticsearchClient;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public setup(analytics: AnalyticsServiceSetup) {
    this.analytics = analytics;
  }

  public async start(telemetryStart?: TelemetryPluginStart, core?: CoreStart) {
    this.telemetryStart = telemetryStart;
    this.esClient = core?.elasticsearch.client.asInternalUser;

    this.logger.debug(`[Logs Data Telemetry] Starting the service`);
    timer(STARTUP_DELAY, TELEMETRY_INTERVAL)
      .pipe(
        takeUntil(this.stop$),
        tap(() => (this.isInProgress = true)),
        switchMap(() => from(this.isTelemetryOptedIn())),
        tap((isOptedIn) => {
          if (!isOptedIn) {
            this.logTelemetryNotOptedIn();
            this.isInProgress = false;
          }
        }),
        filter((isOptedIn) => isOptedIn),
        exhaustMap(() => this.collectAndSend()),
        tap(() => (this.isInProgress = false))
      )
      .subscribe();
  }

  public stop() {
    this.stop$.next();
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
        delay(BREATHE_DELAY_SHORT),
        switchMap((dataStreamsAndIndicesInfo) => {
          return addMappingsToIndices({
            esClient: this.esClient!,
            dataStreamsInfo: dataStreamsAndIndicesInfo,
            logsIndexPatterns: LOGS_DATASET_INDEX_PATTERNS,
            breatheDelay: BREATHE_DELAY_MEDIUM,
          });
        }),
        delay(BREATHE_DELAY_SHORT),
        switchMap((dataStreamsAndIndicesInfo) => {
          return addNamespace({
            dataStreamsInfo: dataStreamsAndIndicesInfo,
            breatheDelay: BREATHE_DELAY_SHORT,
          });
        }),
        delay(BREATHE_DELAY_SHORT),
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
            breatheDelay: BREATHE_DELAY_SHORT,
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
