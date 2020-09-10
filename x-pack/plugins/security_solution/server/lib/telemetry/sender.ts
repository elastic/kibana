/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, cloneDeep } from 'lodash';

import { PluginInitializerContext, Logger } from '../../../../../../core/server';
import {
  TelemetryPluginsStart,
  TelemetryPluginsSetup,
} from '../../../../../../src/plugins/telemetry/server';

export interface TelemetryEventsSenderContract {
  logger: Logger;
  telemetryStart: TelemetryPluginsStart;
  telemetrySetup: TelemetryPluginsSetup;
}

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

export class TelemetryEventsSender {
  private readonly initialCheckDelayMs = 10 * 1000;
  private readonly checkIntervalMs = 5 * 1000;
  private readonly maxQueueSize = 100;
  private readonly logger: Logger;
  private readonly telemetryStart: TelemetryPluginsStart;
  private readonly telemetrySetup: TelemetryPluginsSetup;
  private intervalId?: NodeJS.Timeout;
  private isSending = false;
  private queue: object[] = [];
  private isOptedIn = true; // Assume true until the first check

  public start(startContract: TelemetryEventsSenderContract) {
    this.logger = startContract.logger.get('telemetry_events');
    this.telemetrySetup = startContract.telemetrySetup;
    this.telemetryStart = startContract.telemetryStart;

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

  public queueTelemetryEvents(events: object[]) {
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

  private processEvents(events: object[]): object[] {
    return events.map(function (obj: object): object {
      const newObj = pick(obj, allowlistTop);
      if ('file' in obj) {
        newObj.file = pick(obj.file, allowlistFile);
        if ('Ext' in obj.file) {
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

    this.isOptedIn = await this.telemetryStart?.getIsOptedIn();
    if (!this.isOptedIn) {
      this.logger.debug(`Telemetry is not opted-in.`);
      this.queue = [];
      return;
    }

    const telemetryUrl = await this.telemetrySetup?.getTelemetryUrl();
    this.logger.debug(`Telemetry URL: ${telemetryUrl}`);

    try {
      this.isSending = true;
      const toSend: object[] = cloneDeep(this.queue);
      this.queue = [];
      this.sendEvents(toSend);
    } catch (err) {
      this.logger.warn(`Error sending telemetry events data: ${err}`);
    }
    this.isSending = false;
  }

  private async sendEvents(events: object[]) {
    // TODO
    this.logger.debug(`Events sent!`);
    // this.logger.debug(`Sending events: ${JSON.stringify(events, null, 2)}`);
  }
}
