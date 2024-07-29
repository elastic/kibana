/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exhaustMap, Subject, takeUntil, timer } from 'rxjs';
import type { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TelemetryPluginStart, TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';

import type { InfoResponse } from '@elastic/elasticsearch/lib/api/types';

import { CLUSTER_SETTLEMENT_DELAY, EXCLUDE_ELASTIC_LOGS, TELEMETRY_INTERVAL } from './constants';
import { getDatasetsForStreamOfLogs } from './helpers';

import { DataTelemetryEvent, StreamOfLog } from './types';

export class DataTelemetryService {
  private readonly logger: Logger;
  private readonly stop$ = new Subject<void>();

  private telemetryStart?: TelemetryPluginStart;

  // @ts-ignore: Unused variable
  private telemetrySetup?: TelemetryPluginSetup;
  private isSending = false;

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
    timer(CLUSTER_SETTLEMENT_DELAY, TELEMETRY_INTERVAL)
      .pipe(
        takeUntil(this.stop$),
        exhaustMap(() => this.collectAndSend())
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

  private async collectAndSend() {
    // Gather data streams related to each stream of log

    if (this.isSending) {
      return;
    }

    this.isSending = true;

    this.isOptedIn = await this.isTelemetryOptedIn();
    if (!this.isOptedIn) {
      this.logger.debug(`[Logs Data Telemetry] Telemetry is not opted-in.`);
      return;
    }

    // From StreamOfLog
    const streamOfLogs = Object.values(StreamOfLog);
    if (this.esClient) {
      // Get all data streams
      const results = await getDatasetsForStreamOfLogs({
        esClient: this.esClient,
        streamOfLogs,
        excludeStreamsStartingWith: EXCLUDE_ELASTIC_LOGS,
      });

      // TODO: Send telemetry events
    }

    this.isSending = false;
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
      this.logger.debug(`[Logs Data Telemetry] Error fetching cluster information: ${e}`);
    }
  }

  // @ts-ignore: Unused function
  public async scheduleSendingEvents(telemetryUrl: string, events: DataTelemetryEvent[]) {
    // TODO: Implement sending events to the channel
  }

  // @ts-ignore: Unused function
  private async getTelemetryChannelUrl(channel: string) {
    // TODO: Implement fetching telemetry URL
  }

  // @ts-ignore: Unused function
  private async send(events: unknown[], telemetryUrl: string) {
    // TODO: Implement sending events to the telemetry URL over HTTP
  }
}
