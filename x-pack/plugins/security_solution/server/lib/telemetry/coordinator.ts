/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { Logger } from 'src/core/server';
import { UsageCounter } from 'src/plugins/usage_collection/server';
import { TelemetryPluginStart, TelemetryPluginSetup } from 'src/plugins/telemetry/server';
import { TelemetryEventsSender } from './sender';
import { TelemetryReceiver } from './receiver';
import { TelemetryEvent } from './types';
import { createTelemetryTaskConfigs } from './tasks';
import { createUsageCounterLabel } from './helpers';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';
import { TELEMETRY_MAX_BUFFER_SIZE, TELEMETRY_USAGE_LABEL_PREFIX } from './constants';
import { SecurityTelemetryTask, SecurityTelemetryTaskConfig } from './task';

const USAGE_LABEL_PREFIX: string[] = TELEMETRY_USAGE_LABEL_PREFIX.concat(['coordinator']);

export class TelemetryCoordinator {
  private readonly initialCheckDelayMs = 10 * 1000;
  private readonly checkIntervalMs = 60 * 1000;
  private readonly logger: Logger;
  private maxQueueSize = TELEMETRY_MAX_BUFFER_SIZE;
  private telemetryStart?: TelemetryPluginStart;
  private telemetrySetup?: TelemetryPluginSetup;
  private intervalId?: NodeJS.Timeout;
  private isSending = false;
  private queue: TelemetryEvent[] = [];
  private isOptedIn?: boolean = true; // Assume true until the first check
  private telemetryUsageCounter?: UsageCounter;
  private telemetryTasks?: SecurityTelemetryTask[];
  private sender: TelemetryEventsSender;
  private receiver: TelemetryReceiver | undefined;

  constructor(logger: Logger) {
    this.logger = logger.get('telemetry_events');
    this.sender = new TelemetryEventsSender(this.logger);
  }

  public async isTelemetryOptedIn() {
    this.isOptedIn = await this.telemetryStart?.getIsOptedIn();
    return this.isOptedIn === true;
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
        counterName: createUsageCounterLabel(USAGE_LABEL_PREFIX.concat(['queue_stats'])),
        counterType: 'docs_lost',
        incrementBy: events.length,
      });
      this.telemetryUsageCounter?.incrementCounter({
        counterName: createUsageCounterLabel(USAGE_LABEL_PREFIX.concat(['queue_stats'])),
        counterType: 'num_capacity_exceeded',
        incrementBy: 1,
      });
      this.queue.push(...this.sender.processEvents(events.slice(0, this.maxQueueSize - qlength)));
    } else {
      this.queue.push(...this.sender.processEvents(events));
    }
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

      const [telemetryUrl, clusterInfo, licenseInfo] = await Promise.all([
        this.sender.fetchTelemetryUrl('alerts-endpoint'),
        this.receiver?.fetchClusterInfo(),
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

      await this.sender.sendEvents(
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

  /**
   * This function sends events to the elastic telemetry channel. Caution is required
   * because it does no allowlist filtering at send time. The function call site is
   * responsible for ensuring sure no sensitive material is in telemetry events.
   *
   * @param channel the elastic telemetry channel
   * @param toSend telemetry events
   */
  public async sendOnDemand(channel: string, toSend: unknown[]) {
    try {
      const [telemetryUrl, clusterInfo, licenseInfo] = await Promise.all([
        this.sender.fetchTelemetryUrl(channel),
        this.receiver?.fetchClusterInfo(),
        this.receiver?.fetchLicenseInfo(),
      ]);

      this.logger.debug(`Telemetry URL: ${telemetryUrl}`);
      this.logger.debug(
        `cluster_uuid: ${clusterInfo?.cluster_uuid} cluster_name: ${clusterInfo?.cluster_name}`
      );

      await this.sender.sendEvents(
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
          const task = new SecurityTelemetryTask(
            config,
            this.logger,
            this.sender,
            telemetryReceiver
          );
          task.register(taskManager);
          return task;
        }
      );
    }
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
}
