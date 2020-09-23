/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, cloneDeep } from 'lodash';

import { LegacyAPICaller } from 'kibana/server';
import { Logger, CoreStart } from '../../../../../../src/core/server';
import {
  TelemetryPluginStart,
  TelemetryPluginSetup,
} from '../../../../../../src/plugins/telemetry/server';

// Allowlist for the fields that we copy from the original event to the
// telemetry event.
// Top level fields:
const allowlistTop = ['@timestamp', 'agent', 'Endpoint', 'ecs', 'elastic'];
// file.* fields:
const allowlistFile = ['path', 'size', 'created', 'accessed', 'mtime', 'directory', 'hash'];
// file.Ext.* fields:
const allowlistFileExt = ['code_signature', 'malware_classification'];
// file.* fields:
const allowlistHost = ['os'];
// event.* fields:
const allowlistEvent = ['kind'];

export type SearchTypes =
  | string
  | string[]
  | number
  | number[]
  | boolean
  | boolean[]
  | object
  | object[]
  | undefined;

export interface TelemetryEvent {
  [key: string]: SearchTypes;
  '@timestamp'?: string;
  datastream?: {
    [key: string]: SearchTypes;
    dataset?: string;
  };
  cluster_name?: string;
  cluster_uuid?: string;
  file?: {
    [key: string]: SearchTypes;
    Ext?: {
      [key: string]: SearchTypes;
    };
  };
}

// Copied from telemetry_collection/get_cluster_info.ts
export interface ESClusterInfo {
  cluster_uuid: string;
  cluster_name: string;
  version: {
    number: string;
    build_flavor: string;
    build_type: string;
    build_hash: string;
    build_date: string;
    build_snapshot?: boolean;
    lucene_version: string;
    minimum_wire_compatibility_version: string;
    minimum_index_compatibility_version: string;
  };
}

/**
 * Get the cluster info from the connected cluster.
 *
 * This is the equivalent to GET /
 *
 * @param {function} callCluster The callWithInternalUser handler (exposed for testing)
 */
export function getClusterInfo(callCluster: LegacyAPICaller) {
  return callCluster<ESClusterInfo>('info');
}

export class TelemetryEventsSender {
  private readonly initialCheckDelayMs = 10 * 1000;
  private readonly checkIntervalMs = 5 * 1000; // TODO: change to 60s before merging
  private readonly logger: Logger;
  private core?: CoreStart;
  private maxQueueSize = 100;
  private telemetryStart?: TelemetryPluginStart;
  private telemetrySetup?: TelemetryPluginSetup;
  private intervalId?: NodeJS.Timeout;
  private isSending = false;
  private queue: TelemetryEvent[] = [];
  private isOptedIn?: boolean = true; // Assume true until the first check

  constructor(logger: Logger) {
    this.logger = logger.get('telemetry_events');
  }

  public setup(telemetrySetup?: TelemetryPluginSetup) {
    this.telemetrySetup = telemetrySetup;
  }

  public start(core?: CoreStart, telemetryStart?: TelemetryPluginStart) {
    this.telemetryStart = telemetryStart;
    this.core = core;

    this.logger.debug(`Starting task`);
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
      this.queue.push(...this.processEvents(events.slice(0, this.maxQueueSize - qlength)));
    } else {
      this.queue.push(...this.processEvents(events));
    }
  }

  public processEvents(events: TelemetryEvent[]): TelemetryEvent[] {
    return events.map(function (obj: TelemetryEvent): TelemetryEvent {
      const newObj: TelemetryEvent = pick(obj, allowlistTop);
      if ('file' in obj) {
        newObj.file = pick(obj.file, allowlistFile);
        if (obj.file?.Ext !== undefined) {
          newObj.file.Ext = pick(obj.file.Ext, allowlistFileExt);
        }
      }
      if ('host' in obj) {
        newObj.host = pick(obj.host, allowlistHost);
      }
      if ('event' in obj) {
        newObj.event = pick(obj.event, allowlistEvent);
      }

      return newObj;
    });
  }

  private async sendIfDue() {
    // this.logger.debug(`Send if due`);
    if (this.isSending) {
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    // Checking opt-in status is relatively expensive (calls a saved-object), so
    // we only check it when we have things to send.
    this.isOptedIn = await this.telemetryStart?.getIsOptedIn();
    if (!this.isOptedIn) {
      this.logger.debug(`Telemetry is not opted-in.`);
      this.queue = [];
      return;
    }

    const telemetryUrl = await this.telemetrySetup?.getTelemetryUrl();
    this.logger.debug(`Telemetry URL: ${telemetryUrl}`);

    const clusterInfo = await this.fetchClusterInfo();
    this.logger.debug(
      `cluster_uuid: ${clusterInfo?.cluster_uuid} cluster_name: ${clusterInfo?.cluster_name}`
    );

    try {
      this.isSending = true;
      const toSend: TelemetryEvent[] = cloneDeep(this.queue);
      this.queue = [];

      if (clusterInfo) {
        toSend.forEach((event) => {
          event.cluster_uuid = clusterInfo.cluster_uuid;
          event.cluster_name = clusterInfo.cluster_name;
        });
      }

      this.sendEvents(toSend);
    } catch (err) {
      this.logger.warn(`Error sending telemetry events data: ${err}`);
    }
    this.isSending = false;
  }

  private async sendEvents(events: object[]) {
    // TODO
    this.logger.debug(`Events sent!`);
    this.logger.debug(`Sending events: ${JSON.stringify(events, null, 2)}`);
  }

  private async fetchClusterInfo(): Promise<ESClusterInfo | undefined> {
    if (!this.core) {
      return undefined;
    }
    const callCluster = this.core.elasticsearch.legacy.client.callAsInternalUser;
    return getClusterInfo(callCluster);
  }
}
