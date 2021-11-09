/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import axios from 'axios';
import { URL } from 'url';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';

import { Logger } from 'src/core/server';
import { TelemetryPluginStart, TelemetryPluginSetup } from 'src/plugins/telemetry/server';
import { UsageCounter } from 'src/plugins/usage_collection/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';
import { TelemetryReceiver } from './receiver';
import { allowlistEventFields, copyAllowlistedFields } from './filters';
import { createTelemetryTaskConfigs } from './tasks';
import { createUsageCounterLabel } from './helpers';
import { TelemetryEvent } from './types';
import { TELEMETRY_MAX_BUFFER_SIZE } from './constants';
import { SecurityTelemetryTask, SecurityTelemetryTaskConfig } from './task';

const usageLabelPrefix: string[] = ['security_telemetry', 'sender'];

export class TelemetryEventsSender {
  private readonly initialCheckDelayMs = 10 * 1000;
  private readonly checkIntervalMs = 60 * 1000;
  private readonly logger: Logger;
  private maxQueueSize = TELEMETRY_MAX_BUFFER_SIZE;
  private telemetryStart?: TelemetryPluginStart;
  private telemetrySetup?: TelemetryPluginSetup;
  private intervalId?: NodeJS.Timeout;
  private isSending = false;
  private receiver: TelemetryReceiver | undefined;
  private queue: TelemetryEvent[] = [];
  private isOptedIn?: boolean = true; // Assume true until the first check

  private telemetryUsageCounter?: UsageCounter;
  private telemetryTasks?: SecurityTelemetryTask[];

  constructor(logger: Logger) {
    this.logger = logger.get('telemetry_events');
  }

  public setup(
    telemetryReceiver: TelemetryReceiver,
    telemetrySetup?: TelemetryPluginSetup,
    taskManager?: TaskManagerSetupContract,
    telemetryUsageCounter?: UsageCounter
  ) {
    this.telemetrySetup = telemetrySetup;
    this.telemetryUsageCounter = telemetryUsageCounter;

    if (taskManager) {
      this.telemetryTasks = createTelemetryTaskConfigs().map(
        (config: SecurityTelemetryTaskConfig) => {
          const task = new SecurityTelemetryTask(config, this.logger, this, telemetryReceiver);
          task.register(taskManager);
          return task;
        }
      );
    }
  }

  public getClusterID(): string | undefined {
    return this.receiver?.getClusterInfo()?.cluster_uuid;
  }

  public start(
    telemetryStart?: TelemetryPluginStart,
    taskManager?: TaskManagerStartContract,
    receiver?: TelemetryReceiver
  ) {
    this.telemetryStart = telemetryStart;
    this.receiver = receiver;

    if (taskManager && this.telemetryTasks) {
      this.logger.debug(`Starting security telemetry tasks`);
      this.telemetryTasks.forEach((task) => task.start(taskManager));
    }

    this.logger.debug(`Starting local task`);
    setTimeout(() => {
      this.sendIfDue();
      this.intervalId = setInterval(() => this.sendIfDue(), this.checkIntervalMs);
    }, this.initialCheckDelayMs);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  public queueTelemetryEvents(events: TelemetryEvent[]) {
    const qlength = this.queue.length;

    if (events.length === 0) {
      return;
    }

    this.logger.debug(`Queue events`);

    if (qlength >= this.maxQueueSize) {
      // we're full already
      return;
    }

    if (events.length > this.maxQueueSize - qlength) {
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
      this.queue.push(...this.processEvents(events));
    }
  }

  public async isTelemetryOptedIn() {
    this.isOptedIn = await this.telemetryStart?.getIsOptedIn();
    return this.isOptedIn === true;
  }

  private async sendIfDue() {
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
        this.logger.debug(`Telemetry is not opted-in.`);
        this.queue = [];
        this.isSending = false;
        return;
      }

      const clusterInfo = this.receiver?.getClusterInfo();

      const [telemetryUrl, licenseInfo] = await Promise.all([
        this.fetchTelemetryUrl('alerts-endpoint'),
        this.receiver?.fetchLicenseInfo(),
      ]);

      this.logger.debug(`Telemetry URL: ${telemetryUrl}`);
      this.logger.debug(
        `cluster_uuid: ${clusterInfo?.cluster_uuid} cluster_name: ${clusterInfo?.cluster_name}`
      );

      const toSend: TelemetryEvent[] = cloneDeep(this.queue).map((event) => ({
        ...event,
        ...(licenseInfo ? { license: this.receiver?.copyLicenseFields(licenseInfo) } : {}),
        cluster_uuid: clusterInfo?.cluster_uuid,
        cluster_name: clusterInfo?.cluster_name,
      }));
      this.queue = [];

      await this.sendEvents(
        toSend,
        telemetryUrl,
        'alerts-endpoint',
        clusterInfo?.cluster_uuid,
        clusterInfo?.version?.number,
        licenseInfo?.uid
      );
    } catch (err) {
      this.logger.warn(`Error sending telemetry events data: ${err}`);
      this.queue = [];
    }
    this.isSending = false;
  }

  public processEvents(events: TelemetryEvent[]): TelemetryEvent[] {
    return events.map(function (obj: TelemetryEvent): TelemetryEvent {
      return copyAllowlistedFields(allowlistEventFields, obj);
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
  public async sendOnDemand(channel: string, toSend: unknown[]) {
    const clusterInfo = this.receiver?.getClusterInfo();
    try {
      const [telemetryUrl, licenseInfo] = await Promise.all([
        this.fetchTelemetryUrl(channel),
        this.receiver?.fetchLicenseInfo(),
      ]);

      this.logger.debug(`Telemetry URL: ${telemetryUrl}`);
      this.logger.debug(
        `cluster_uuid: ${clusterInfo?.cluster_uuid} cluster_name: ${clusterInfo?.cluster_name}`
      );

      await this.sendEvents(
        toSend,
        telemetryUrl,
        channel,
        clusterInfo?.cluster_uuid,
        clusterInfo?.version?.number,
        licenseInfo?.uid
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

  private async sendEvents(
    events: unknown[],
    telemetryUrl: string,
    channel: string,
    clusterUuid: string | undefined,
    clusterVersionNumber: string | undefined,
    licenseId: string | undefined
  ) {
    const ndjson = transformDataToNdjson(events);

    try {
      this.logger.debug(`Sending ${events.length} telemetry events to ${channel}`);
      const resp = await axios.post(telemetryUrl, ndjson, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'X-Elastic-Cluster-ID': clusterUuid,
          'X-Elastic-Stack-Version': clusterVersionNumber ? clusterVersionNumber : '7.10.0',
          ...(licenseId ? { 'X-Elastic-License-ID': licenseId } : {}),
        },
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
      this.logger.debug(`Events sent!. Response: ${resp.status} ${JSON.stringify(resp.data)}`);
    } catch (err) {
      this.logger.debug(`Error sending events: ${err}`);
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
