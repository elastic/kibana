/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';

import { cloneDeep } from 'lodash';
import axios from 'axios';
import type { Logger } from 'src/core/server';
import type { TelemetryPluginStart, TelemetryPluginSetup } from 'src/plugins/telemetry/server';

import type { TelemetryEvent } from './types';
import type { TelemetryReceiver } from './receiver';

export const TELEMETRY_MAX_BUFFER_SIZE = 100;
export const FLEET_CHANNEL_NAME = 'fleet-stats';

export class TelemetryEventsSender {
  private readonly initialCheckDelayMs = 10 * 1000;
  private readonly checkIntervalMs = 10 * 1000;
  private readonly logger: Logger;
  private maxQueueSize = TELEMETRY_MAX_BUFFER_SIZE;
  private telemetryStart?: TelemetryPluginStart;
  private telemetrySetup?: TelemetryPluginSetup;
  private intervalId?: NodeJS.Timeout;
  private isSending = false;
  private receiver: TelemetryReceiver | undefined;
  private queue: TelemetryEvent[] = [];
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

  public queueTelemetryEvents(events: TelemetryEvent[]) {
    const qlength = this.queue.length;

    if (events.length === 0) {
      return;
    }

    events = events.filter((event) => !this.queue.find((qItem) => qItem.id === event.id));

    this.logger.info(`Queue events ` + JSON.stringify(events));

    if (qlength >= this.maxQueueSize) {
      // we're full already
      return;
    }

    if (events.length > this.maxQueueSize - qlength) {
      this.queue.push(...events.slice(0, this.maxQueueSize - qlength));
    } else {
      this.queue.push(...events);
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

      this.isOptedIn = true; // await this.isTelemetryOptedIn();
      if (!this.isOptedIn) {
        this.logger.info(`Telemetry is not opted-in.`);
        this.queue = [];
        this.isSending = false;
        return;
      }

      const [telemetryUrl, clusterInfo, licenseInfo] = await Promise.all([
        this.fetchTelemetryUrl(FLEET_CHANNEL_NAME),
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

      this.logger.info('sending events to: ' + telemetryUrl);
      this.logger.info(JSON.stringify(toSend));

      await this.sendEvents(
        toSend,
        telemetryUrl,
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
  // public async sendOnDemand(channel: string, toSend: unknown[]) {
  //   try {
  //     const [telemetryUrl, clusterInfo, licenseInfo] = await Promise.all([
  //       this.fetchTelemetryUrl(channel),
  //       this.receiver?.fetchClusterInfo(),
  //       this.receiver?.fetchLicenseInfo(),
  //     ]);

  //     this.logger.debug(`Telemetry URL: ${telemetryUrl}`);
  //     this.logger.debug(
  //       `cluster_uuid: ${clusterInfo?.cluster_uuid} cluster_name: ${clusterInfo?.cluster_name}`
  //     );

  //     await this.sendEvents(
  //       toSend,
  //       telemetryUrl,
  //       channel,
  //       clusterInfo?.cluster_uuid,
  //       clusterInfo?.version?.number,
  //       licenseInfo?.uid
  //     );
  //   } catch (err) {
  //     this.logger.warn(`Error sending telemetry events data: ${err}`);
  //   }
  // }

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
    clusterUuid: string | undefined,
    clusterVersionNumber: string | undefined,
    licenseId: string | undefined
  ) {
    const ndjson = this.transformDataToNdjson(events);

    try {
      const resp = await axios.post(telemetryUrl, ndjson, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'X-Elastic-Cluster-ID': clusterUuid,
          'X-Elastic-Stack-Version': clusterVersionNumber ? clusterVersionNumber : '7.16.0',
          ...(licenseId ? { 'X-Elastic-License-ID': licenseId } : {}),
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
