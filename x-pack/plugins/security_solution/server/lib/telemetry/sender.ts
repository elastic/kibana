/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { URL } from 'url';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';

import type { Logger, LogMeta } from '@kbn/core/server';
import type { TelemetryPluginStart, TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { AxiosInstance } from 'axios';
import axios from 'axios';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { exhaustMap, Subject, takeUntil, timer } from 'rxjs';
import type { ITelemetryReceiver } from './receiver';
import { copyAllowlistedFields, filterList } from './filterlists';
import { createTelemetryTaskConfigs } from './tasks';
import { copyLicenseFields, createUsageCounterLabel, newTelemetryLogger } from './helpers';
import { type TelemetryLogger } from './telemetry_logger';
import type { TelemetryChannel, TelemetryEvent } from './types';
import type { SecurityTelemetryTaskConfig } from './task';
import { SecurityTelemetryTask } from './task';
import { telemetryConfiguration } from './configuration';
import type { IAsyncTelemetryEventsSender, QueueConfig } from './async_sender.types';
import { TaskMetricsService } from './task_metrics';

const usageLabelPrefix: string[] = ['security_telemetry', 'sender'];

export interface ITelemetryEventsSender {
  setup(
    telemetryReceiver: ITelemetryReceiver,
    telemetrySetup?: TelemetryPluginSetup,
    taskManager?: TaskManagerSetupContract,
    telemetryUsageCounter?: UsageCounter,
    asyncTelemetrySender?: IAsyncTelemetryEventsSender
  ): void;

  getTelemetryUsageCluster(): UsageCounter | undefined;
  getClusterID(): string | undefined;

  start(
    telemetryStart?: TelemetryPluginStart,
    taskManager?: TaskManagerStartContract,
    receiver?: ITelemetryReceiver
  ): void;

  stop(): void;
  /**
   * @deprecated Use `sendAsync` instead.
   */
  queueTelemetryEvents(events: TelemetryEvent[]): void;
  isTelemetryOptedIn(): Promise<boolean>;
  isTelemetryServicesReachable(): Promise<boolean>;
  sendIfDue(axiosInstance?: AxiosInstance): Promise<void>;
  processEvents(events: TelemetryEvent[]): TelemetryEvent[];
  sendOnDemand(channel: string, toSend: unknown[], axiosInstance?: AxiosInstance): Promise<void>;
  getV3UrlFromV2(v2url: string, channel: string): string;

  // As a transition to the new sender, `IAsyncTelemetryEventsSender`, we wrap
  // its "public API" here to expose a single Sender interface to the rest
  // of the code. The `queueTelemetryEvents` is deprecated in favor of
  // `sendAsync`.

  /**
   * Sends events to a given telemetry channel asynchronously.
   */
  sendAsync: (channel: TelemetryChannel, events: unknown[]) => void;

  /**
   * Simulates sending events to a given telemetry channel asynchronously
   * and returns the request that should be sent to the server
   */
  simulateSendAsync: (channel: TelemetryChannel, events: unknown[]) => string[];

  /**
   * Updates the queue configuration for a given channel.
   */
  updateQueueConfig: (channel: TelemetryChannel, config: QueueConfig) => void;

  /**
   * Updates the default queue configuration.
   */
  updateDefaultQueueConfig: (config: QueueConfig) => void;
}

export class TelemetryEventsSender implements ITelemetryEventsSender {
  private readonly initialCheckDelayMs = 10 * 1000;
  private readonly checkIntervalMs = 60 * 1000;
  private readonly logger: TelemetryLogger;
  private readonly stop$ = new Subject<void>();
  private maxQueueSize = telemetryConfiguration.telemetry_max_buffer_size;
  private telemetryStart?: TelemetryPluginStart;
  private telemetrySetup?: TelemetryPluginSetup;
  private isSending = false;
  private receiver: ITelemetryReceiver | undefined;
  private queue: TelemetryEvent[] = [];

  // Assume both true until the first check
  private isOptedIn?: boolean = true;
  private isElasticTelemetryReachable?: boolean = true;

  private telemetryUsageCounter?: UsageCounter;
  private telemetryTasks?: SecurityTelemetryTask[];

  private asyncTelemetrySender?: IAsyncTelemetryEventsSender;

  constructor(logger: Logger) {
    this.logger = newTelemetryLogger(logger.get('telemetry_events.sender'));
  }

  public setup(
    telemetryReceiver: ITelemetryReceiver,
    telemetrySetup?: TelemetryPluginSetup,
    taskManager?: TaskManagerSetupContract,
    telemetryUsageCounter?: UsageCounter,
    asyncTelemetrySender?: IAsyncTelemetryEventsSender
  ) {
    this.telemetrySetup = telemetrySetup;
    this.telemetryUsageCounter = telemetryUsageCounter;
    if (taskManager) {
      const taskMetricsService = new TaskMetricsService(this.logger, this);
      this.telemetryTasks = createTelemetryTaskConfigs().map(
        (config: SecurityTelemetryTaskConfig) => {
          const task = new SecurityTelemetryTask(
            config,
            this.logger,
            this,
            telemetryReceiver,
            taskMetricsService
          );
          task.register(taskManager);
          return task;
        }
      );
    }
    this.asyncTelemetrySender = asyncTelemetrySender;
  }

  public getTelemetryUsageCluster(): UsageCounter | undefined {
    return this.telemetryUsageCounter;
  }

  public getClusterID(): string | undefined {
    return this.receiver?.getClusterInfo()?.cluster_uuid;
  }

  public start(
    telemetryStart?: TelemetryPluginStart,
    taskManager?: TaskManagerStartContract,
    receiver?: ITelemetryReceiver
  ) {
    this.telemetryStart = telemetryStart;
    this.receiver = receiver;
    if (taskManager && this.telemetryTasks) {
      this.logger.l('Starting security telemetry tasks');
      this.telemetryTasks.forEach((task) => task.start(taskManager));
    }

    this.logger.l('Starting local task');
    timer(this.initialCheckDelayMs, this.checkIntervalMs)
      .pipe(
        takeUntil(this.stop$),
        exhaustMap(() => this.sendIfDue())
      )
      .subscribe();
  }

  public stop() {
    this.stop$.next();
  }

  public queueTelemetryEvents(events: TelemetryEvent[]) {
    const qlength = this.queue.length;
    this.logger.debug('Enqueuing events', {
      queue_length: qlength,
      events: events.length,
    } as LogMeta);
    if (events.length === 0) {
      this.logger.l('No events to queue');
      return;
    }

    if (qlength >= this.maxQueueSize) {
      // we're full already
      this.logger.l('Queue length is greater than max queue size');
      return;
    }
    if (events.length > this.maxQueueSize - qlength) {
      this.logger.l('Events exceed remaining queue size', {
        max_queue_size: this.maxQueueSize,
        queue_length: qlength,
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(usageLabelPrefix.concat(['queue_stats'])),
        counterType: 'docs_lost',
        incrementBy: events.length,
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(usageLabelPrefix.concat(['queue_stats'])),
        counterType: 'num_capacity_exceeded',
        incrementBy: 1,
      });
      this.queue.push(...this.processEvents(events.slice(0, this.maxQueueSize - qlength)));
    } else {
      this.logger.debug('Events fit within queue size');
      this.queue.push(...this.processEvents(events));
    }
  }

  public async isTelemetryOptedIn() {
    this.isOptedIn = await this.telemetryStart?.getIsOptedIn();
    return this.isOptedIn === true;
  }

  /**
   * Issue: https://github.com/elastic/kibana/issues/133321
   *
   * As of 8.3 - Telemetry is opted in by default, but the Kibana instance may
   * be deployed in a network where outbound connections are restricted. This
   * causes hanging connections in backend telemetry code. A previous bugfix
   * included a default timeout for the client, but this code shouldn't be
   * reachable if we cannot connect to Elastic Telemetry Services. This
   * function call can be utilized to check if the Kibana instance can
   * call out.
   *
   * Please note that this function should be used with care. DO NOT call this
   * function in a way that does not take into consideration if the deployment
   * opted out of telemetry. For example,
   *
   * DO NOT
   * --------
   *
   * if (isTelemetryServicesReachable() && isTelemetryOptedIn()) {
   *   ...
   * }
   *
   * DO
   * --------
   *
   * if (isTelemetryOptedIn() && isTelemetryServicesReachable()) {
   *   ...
   * }
   *
   * Is ok because the call to `isTelemetryServicesReachable()` is never called
   * because `isTelemetryOptedIn()` short-circuits the conditional.
   *
   * DO NOT
   * --------
   *
   * const [optedIn, isReachable] = await Promise.all([
   *  isTelemetryOptedIn(),
   *  isTelemetryServicesReachable(),
   * ]);
   *
   * As it does not take into consideration the execution order and makes a redundant
   * network call to Elastic Telemetry Services.
   *
   * Staging URL: https://telemetry-staging.elastic.co/ping
   * Production URL: https://telemetry.elastic.co/ping
   */
  public async isTelemetryServicesReachable() {
    try {
      const telemetryUrl = await this.fetchTelemetryPingUrl();
      const resp = await axios.get(telemetryUrl, { timeout: 3000 });
      if (resp.status === 200) {
        this.logger.l('[Security Telemetry] elastic telemetry services are reachable');
        return true;
      }

      return false;
    } catch (_err) {
      return false;
    }
  }

  public async sendIfDue(axiosInstance: AxiosInstance = axios) {
    if (this.isSending) {
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    try {
      this.isSending = true;

      this.isOptedIn = await this.isTelemetryOptedIn();
      if (!this.isOptedIn) {
        this.logger.l('Telemetry is not opted-in.');
        this.queue = [];
        this.isSending = false;
        return;
      }

      this.isElasticTelemetryReachable = await this.isTelemetryServicesReachable();
      if (!this.isElasticTelemetryReachable) {
        this.logger.l('Telemetry Services are not reachable.');
        this.queue = [];
        this.isSending = false;
        return;
      }

      const clusterInfo = this.receiver?.getClusterInfo();

      const [telemetryUrl, licenseInfo] = await Promise.all([
        this.fetchTelemetryUrl('alerts-endpoint'),
        this.receiver?.fetchLicenseInfo(),
      ]);

      this.logger.debug('Telemetry URL', {
        url: telemetryUrl,
      } as LogMeta);

      const toSend: TelemetryEvent[] = cloneDeep(this.queue).map((event) => ({
        ...event,
        ...(licenseInfo ? { license: copyLicenseFields(licenseInfo) } : {}),
        cluster_uuid: clusterInfo?.cluster_uuid,
        cluster_name: clusterInfo?.cluster_name,
      }));
      this.queue = [];

      await this.sendEvents(
        toSend,
        telemetryUrl,
        'alerts-endpoint',
        clusterInfo?.cluster_uuid,
        clusterInfo?.cluster_name,
        clusterInfo?.version?.number,
        licenseInfo?.uid,
        axiosInstance
      );
    } catch (err) {
      this.logger.warn(`Error sending telemetry events data: ${err}`);
      this.queue = [];
    }
    this.isSending = false;
  }

  public processEvents(events: TelemetryEvent[]): TelemetryEvent[] {
    return events.map(function (obj: TelemetryEvent): TelemetryEvent {
      return copyAllowlistedFields(filterList.endpointAlerts, obj);
    });
  }

  /**
   * This function sends events to the elastic telemetry channel. Caution is required
   * because it does no allowlist filtering at send time. The function call site is
   * responsible for ensuring sure no sensitive material is in telemetry events.
   *
   * @param channel the elastic telemetry channel
   * @param toSend telemetry events
   */
  public async sendOnDemand(
    channel: string,
    toSend: unknown[],
    axiosInstance: AxiosInstance = axios
  ) {
    const clusterInfo = this.receiver?.getClusterInfo();
    try {
      const [telemetryUrl, licenseInfo] = await Promise.all([
        this.fetchTelemetryUrl(channel),
        this.receiver?.fetchLicenseInfo(),
      ]);

      this.logger.l('Telemetry URL', {
        url: telemetryUrl,
      });

      await this.sendEvents(
        toSend,
        telemetryUrl,
        channel,
        clusterInfo?.cluster_uuid,
        clusterInfo?.cluster_name,
        clusterInfo?.version?.number,
        licenseInfo?.uid,
        axiosInstance
      );
    } catch (err) {
      this.logger.warn(`Error sending telemetry events data: ${err}`);
    }
  }

  private async fetchTelemetryUrl(channel: string): Promise<string> {
    const telemetryUrl = await this.telemetrySetup?.getTelemetryUrl();
    if (!telemetryUrl) {
      throw Error("Couldn't get telemetry URL");
    }
    return this.getV3UrlFromV2(telemetryUrl.toString(), channel);
  }

  // Forms URLs like:
  // https://telemetry.elastic.co/v3/send/my-channel-name or
  // https://telemetry-staging.elastic.co/v3-dev/send/my-channel-name
  public getV3UrlFromV2(v2url: string, channel: string): string {
    const url = new URL(v2url);
    if (!url.hostname.includes('staging')) {
      url.pathname = `/v3/send/${channel}`;
    } else {
      url.pathname = `/v3-dev/send/${channel}`;
    }
    return url.toString();
  }

  public sendAsync(channel: TelemetryChannel, events: unknown[]): void {
    this.getAsyncTelemetrySender().send(channel, events);
  }

  public simulateSendAsync(channel: TelemetryChannel, events: unknown[]): string[] {
    return this.getAsyncTelemetrySender().simulateSend(channel, events);
  }

  public updateQueueConfig(channel: TelemetryChannel, config: QueueConfig): void {
    this.getAsyncTelemetrySender().updateQueueConfig(channel, config);
  }

  public updateDefaultQueueConfig(config: QueueConfig): void {
    this.getAsyncTelemetrySender().updateDefaultQueueConfig(config);
  }

  private getAsyncTelemetrySender(): IAsyncTelemetryEventsSender {
    if (!this.asyncTelemetrySender) {
      throw new Error('Telemetry Sender V2 not initialized');
    }
    return this.asyncTelemetrySender;
  }

  private async fetchTelemetryPingUrl(): Promise<string> {
    const telemetryUrl = await this.telemetrySetup?.getTelemetryUrl();
    if (!telemetryUrl) {
      throw Error("Couldn't get telemetry URL");
    }

    telemetryUrl.pathname = `/ping`;
    return telemetryUrl.toString();
  }

  private async sendEvents(
    events: unknown[],
    telemetryUrl: string,
    channel: string,
    clusterUuid: string | undefined,
    clusterName: string | undefined,
    clusterVersionNumber: string | undefined,
    licenseId: string | undefined,
    axiosInstance: AxiosInstance = axios
  ) {
    const ndjson = transformDataToNdjson(events);

    try {
      this.logger.debug('Sending telemetry events', {
        events: events.length,
        channel,
      } as LogMeta);
      const resp = await axiosInstance.post(telemetryUrl, ndjson, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          ...(clusterUuid ? { 'X-Elastic-Cluster-ID': clusterUuid } : undefined),
          ...(clusterName ? { 'X-Elastic-Cluster-Name': clusterName } : undefined),
          'X-Elastic-Stack-Version': clusterVersionNumber ? clusterVersionNumber : '8.0.0',
          ...(licenseId ? { 'X-Elastic-License-ID': licenseId } : {}),
        },
        timeout: 10000,
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(usageLabelPrefix.concat(['payloads', channel])),
        counterType: resp.status.toString(),
        incrementBy: 1,
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(usageLabelPrefix.concat(['payloads', channel])),
        counterType: 'docs_sent',
        incrementBy: events.length,
      });
      this.logger.l('Events sent!. Response', { status: resp.status });
    } catch (err) {
      this.logger.l('Error sending events', { error: JSON.stringify(err) });
      const errorStatus = err?.response?.status;
      if (errorStatus !== undefined && errorStatus !== null) {
        this.telemetryUsageCounter?.incrementCounter({
          counterName: createUsageCounterLabel(usageLabelPrefix.concat(['payloads', channel])),
          counterType: errorStatus.toString(),
          incrementBy: 1,
        });
      }
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(usageLabelPrefix.concat(['payloads', channel])),
        counterType: 'docs_lost',
        incrementBy: events.length,
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(usageLabelPrefix.concat(['payloads', channel])),
        counterType: 'num_exceptions',
        incrementBy: 1,
      });
    }
  }
}
