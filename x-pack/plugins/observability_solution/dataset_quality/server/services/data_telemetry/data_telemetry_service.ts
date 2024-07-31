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
  concatMap,
  map,
  of,
  EMPTY,
} from 'rxjs';
import type { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TelemetryPluginStart, TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';

import type { InfoResponse } from '@elastic/elasticsearch/lib/api/types';

import {
  BREATHE_DELAY_MEDIUM,
  BREATHE_DELAY_SHORT,
  NON_LOG_SIGNALS,
  EXCLUDE_ELASTIC_LOGS,
  MAX_STREAMS_TO_REPORT,
  STARTUP_DELAY,
  TELEMETRY_INTERVAL,
  TELEMETRY_CHANNEL,
} from './constants';
import {
  addMappingsToDataStreams,
  addStreamNameAndNamespace,
  groupStatsByStreamName,
  addDataStreamBasicStats,
  getDataStreamsInfoForStreamOfLogs,
  streamStatsToTelemetryEvents,
} from './helpers';

import { DataTelemetryEvent, StreamOfLog } from './types';

export class DataTelemetryService {
  private readonly logger: Logger;
  private readonly stop$ = new Subject<void>();

  private telemetryStart?: TelemetryPluginStart;

  // @ts-ignore: Unused variable
  private telemetrySetup?: TelemetryPluginSetup;

  // @ts-ignore: Unused variable
  private isInProgress = false;

  private isOptedIn?: boolean = true; // Assume true until the first check
  private esClient?: ElasticsearchClient;

  // @ts-ignore: Unused variable
  private clusterInfo?: InfoResponse;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public setup(telemetrySetup?: TelemetryPluginSetup) {
    this.telemetrySetup = telemetrySetup;
  }

  public async start(telemetryStart?: TelemetryPluginStart, core?: CoreStart) {
    this.telemetryStart = telemetryStart;
    this.esClient = core?.elasticsearch.client.asInternalUser;
    this.clusterInfo = await this.fetchClusterInfo();

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
    // Gather data streams related to each stream of log
    const streamOfLogs = Object.values(StreamOfLog);
    if (this.esClient) {
      return getDataStreamsInfoForStreamOfLogs({
        esClient: this.esClient,
        streamOfLogs,
        excludeStreamsStartingWith: [...NON_LOG_SIGNALS, ...EXCLUDE_ELASTIC_LOGS],
        breatheDelay: BREATHE_DELAY_MEDIUM,
      }).pipe(
        switchMap((dataStreamsInfo) => {
          if (dataStreamsInfo.length > MAX_STREAMS_TO_REPORT) {
            this.logger.debug(
              `[Logs Data Telemetry] Number of data streams exceeds ${MAX_STREAMS_TO_REPORT}. Skipping telemetry collection.`
            );
            return EMPTY;
          }
          return of(dataStreamsInfo);
        }),
        delay(BREATHE_DELAY_SHORT),
        switchMap((dataStreamsInfo) => {
          return addMappingsToDataStreams({
            esClient: this.esClient!,
            dataStreamsInfo,
            breatheDelay: BREATHE_DELAY_MEDIUM,
          });
        }),
        delay(BREATHE_DELAY_SHORT),
        switchMap((dataStreamsInfo) => {
          return addStreamNameAndNamespace({
            dataStreamsInfo,
            breatheDelay: BREATHE_DELAY_SHORT,
          });
        }),
        delay(BREATHE_DELAY_SHORT),
        switchMap((streams) => {
          return addDataStreamBasicStats({
            esClient: this.esClient!,
            streams,
            breatheDelay: BREATHE_DELAY_MEDIUM,
          });
        }),
        delay(BREATHE_DELAY_SHORT),
        map((dataStreamsInfo) => {
          return groupStatsByStreamName(dataStreamsInfo);
        }),
        switchMap((statsByStream) => {
          return from(this.fetchClusterInfo()).pipe(
            map((clusterInfo) => {
              return streamStatsToTelemetryEvents(statsByStream, clusterInfo);
            })
          );
        }),
        delay(BREATHE_DELAY_SHORT),
        switchMap((dataTelemetryEvents) => {
          return from(this.getTelemetryChannelUrl(TELEMETRY_CHANNEL)).pipe(
            concatMap((telemetryUrl) => {
              return this.send(dataTelemetryEvents, telemetryUrl);
            })
          );
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

  private async fetchClusterInfo(): Promise<InfoResponse | undefined> {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error(
        '[Logs Data Telemetry]  elasticsearch client is unavailable: cannot retrieve cluster information'
      );
    }

    try {
      return await this.esClient.info();
    } catch (e) {
      this.logger.warn(`[Logs Data Telemetry] Error fetching cluster information: ${e}`);
    }
  }

  private async getTelemetryChannelUrl(channel: string) {
    return ''; // TODO: Implement fetching telemetry URL
  }

  // @ts-ignore: Unused function
  private async send(events: DataTelemetryEvent[], telemetryUrl: string) {
    // TODO: Implement sending events to the telemetry URL over HTTP
    return Promise.resolve(events);
  }

  private logTelemetryNotOptedIn() {
    this.logger.debug(`[Logs Data Telemetry] Telemetry is not opted-in.`);
  }
}
