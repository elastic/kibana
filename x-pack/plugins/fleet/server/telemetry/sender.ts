/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';

import type { Logger } from 'src/core/server';
import type { TelemetryPluginStart, TelemetryPluginSetup } from 'src/plugins/telemetry/server';

import { cloneDeep } from 'lodash';

import axios from 'axios';

import type { TelemetryReceiver } from './receiver';
import { TelemetryQueue } from './queue';

import type { ESClusterInfo, TelemetryEvent } from './types';

/**
 * Simplified version of https://github.com/elastic/kibana/blob/master/x-pack/plugins/security_solution/server/lib/telemetry/sender.ts
 * Sends batched events to telemetry v3 api
 */
export class TelemetryEventsSender {
  private readonly initialCheckDelayMs = 10 * 1000;
  private readonly checkIntervalMs = 30 * 1000;
  private readonly logger: Logger;

  private telemetryStart?: TelemetryPluginStart;
  private telemetrySetup?: TelemetryPluginSetup;
  private intervalId?: NodeJS.Timeout;
  private isSending = false;
  private receiver: TelemetryReceiver | undefined;
  private queuesPerChannel: { [channel: string]: TelemetryQueue } = {};
  private isOptedIn?: boolean = true; // Assume true until the first check

  constructor(logger: Logger) {
    this.logger = logger.get('telemetry_events');
  }

  public setup(telemetrySetup?: TelemetryPluginSetup) {
    this.telemetrySetup = telemetrySetup;
  }

  public start(telemetryStart?: TelemetryPluginStart, receiver?: TelemetryReceiver) {
    this.telemetryStart = telemetryStart;
    this.receiver = receiver;

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

  public queueTelemetryEvents(events: TelemetryEvent[], channel: string) {
    if (!this.queuesPerChannel[channel]) {
      this.queuesPerChannel[channel] = new TelemetryQueue();
    }
    this.queuesPerChannel[channel].addEvents(events);
  }

  public async isTelemetryOptedIn() {
    this.isOptedIn = await this.telemetryStart?.getIsOptedIn();
    return this.isOptedIn === true;
  }

  private async sendIfDue() {
    if (this.isSending) {
      return;
    }

    this.isSending = true;

    this.isOptedIn = await this.isTelemetryOptedIn();
    if (!this.isOptedIn) {
      this.logger.debug(`Telemetry is not opted-in.`);
      for (const channel of Object.keys(this.queuesPerChannel)) {
        this.queuesPerChannel[channel].clearEvents();
      }
      this.isSending = false;
      return;
    }

    const clusterInfo = await this.receiver?.fetchClusterInfo();

    for (const channel of Object.keys(this.queuesPerChannel)) {
      await this.sendEvents(
        await this.fetchTelemetryUrl(channel),
        clusterInfo,
        this.queuesPerChannel[channel]
      );
    }

    this.isSending = false;
  }

  public async sendEvents(
    telemetryUrl: string,
    clusterInfo: ESClusterInfo | undefined,
    queue: TelemetryQueue
  ) {
    const events = queue.getEvents();
    if (events.length === 0) {
      return;
    }

    try {
      this.logger.debug(`Telemetry URL: ${telemetryUrl}`);

      const toSend: TelemetryEvent[] = cloneDeep(events).map((event) => ({
        ...event,
        cluster_uuid: clusterInfo?.cluster_uuid,
        cluster_name: clusterInfo?.cluster_name,
      }));
      queue.clearEvents();

      this.logger.debug(JSON.stringify(toSend));

      await this.send(
        toSend,
        telemetryUrl,
        clusterInfo?.cluster_uuid,
        clusterInfo?.version?.number
      );
    } catch (err) {
      this.logger.warn(`Error sending telemetry events data: ${err}`);
      queue.clearEvents();
    }
  }

  // TODO update once kibana uses v3 too https://github.com/elastic/kibana/pull/113525
  private async fetchTelemetryUrl(channel: string): Promise<string> {
    const telemetryUrl = await this.telemetrySetup?.getTelemetryUrl();
    if (!telemetryUrl) {
      throw Error("Couldn't get telemetry URL");
    }
    return this.getV3UrlFromV2(telemetryUrl.toString(), channel);
  }

  // Forms URLs like:
  // https://telemetry.elastic.co/v3/send/my-channel-name or
  // https://telemetry-staging.elastic.co/v3/send/my-channel-name
  public getV3UrlFromV2(v2url: string, channel: string): string {
    const url = new URL(v2url);
    url.pathname = `/v3/send/${channel}`;
    return url.toString();
  }

  private async send(
    events: unknown[],
    telemetryUrl: string,
    clusterUuid: string | undefined,
    clusterVersionNumber: string | undefined
  ) {
    const ndjson = this.transformDataToNdjson(events);

    try {
      const resp = await axios.post(telemetryUrl, ndjson, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'X-Elastic-Cluster-ID': clusterUuid,
          'X-Elastic-Stack-Version': clusterVersionNumber ? clusterVersionNumber : '7.16.0',
        },
      });
      this.logger.debug(`Events sent!. Response: ${resp.status} ${JSON.stringify(resp.data)}`);
    } catch (err) {
      this.logger.warn(
        `Error sending events: ${err.response.status} ${JSON.stringify(err.response.data)}`
      );
    }
  }

  private transformDataToNdjson = (data: unknown[]): string => {
    if (data.length !== 0) {
      const dataString = data.map((dataItem) => JSON.stringify(dataItem)).join('\n');
      return `${dataString}\n`;
    } else {
      return '';
    }
  };
}
