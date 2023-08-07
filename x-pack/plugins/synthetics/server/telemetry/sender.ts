/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TelemetryPluginStart, TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';

import { cloneDeep } from 'lodash';

import axios from 'axios';

import type { InfoResponse, LicenseGetResponse } from '@elastic/elasticsearch/lib/api/types';

import { TelemetryQueue } from './queue';

import type { MonitorUpdateTelemetryChannel, MonitorUpdateTelemetryChannelEvents } from './types';

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
  private queuesPerChannel: { [channel: string]: TelemetryQueue<any> } = {};
  private isOptedIn?: boolean = true; // Assume true until the first check
  private esClient?: ElasticsearchClient;
  private clusterInfo?: InfoResponse;
  private licenseInfo?: LicenseGetResponse;

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
    this.licenseInfo = await this.fetchLicenseInfo();

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

  public queueTelemetryEvents<T extends MonitorUpdateTelemetryChannel>(
    channel: T,
    events: Array<MonitorUpdateTelemetryChannelEvents[T]>
  ) {
    if (!this.queuesPerChannel[channel]) {
      this.queuesPerChannel[channel] = new TelemetryQueue<MonitorUpdateTelemetryChannelEvents[T]>();
    }
    this.queuesPerChannel[channel].addEvents(cloneDeep(events));
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

    for (const channel of Object.keys(this.queuesPerChannel)) {
      await this.sendEvents(await this.fetchTelemetryUrl(channel), this.queuesPerChannel[channel]);
    }

    this.isSending = false;
  }

  private async fetchClusterInfo(): Promise<InfoResponse | undefined> {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve cluster information');
    }

    try {
      return await this.esClient.info();
    } catch (e) {
      this.logger.debug(`Error fetching cluster information: ${e}`);
    }
  }

  private async fetchLicenseInfo() {
    if (this.esClient === undefined || this.esClient === null) {
      throw Error('elasticsearch client is unavailable: cannot retrieve license information');
    }
    try {
      return await this.esClient.license.get();
    } catch (e) {
      this.logger.debug(`Error fetching license information: ${e}`);
    }
  }

  public async sendEvents(telemetryUrl: string, queue: TelemetryQueue<any>) {
    let events = queue.getEvents();
    if (events.length === 0) {
      return;
    }

    events = events.map((event) => ({ ...event, license: this.licenseInfo?.license }));

    try {
      this.logger.debug(`Telemetry URL: ${telemetryUrl}`);

      queue.clearEvents();

      this.logger.debug(JSON.stringify(events));

      await this.send(events, telemetryUrl);
    } catch (err) {
      this.logger.debug(`Error sending telemetry events data: ${err}`);
      queue.clearEvents();
    }
  }

  // Forms URLs like:
  // https://telemetry.elastic.co/v3/send/my-channel-name or
  // https://telemetry-staging.elastic.co/v3/send/my-channel-name
  private async fetchTelemetryUrl(channel: string): Promise<string> {
    const telemetryUrl = await this.telemetrySetup?.getTelemetryUrl();
    if (!telemetryUrl) {
      throw Error("Couldn't get telemetry URL");
    }
    if (!telemetryUrl.hostname.includes('staging')) {
      telemetryUrl.pathname = `/v3/send/${channel}`;
    } else {
      telemetryUrl.pathname = `/v3-dev/send/${channel}`;
    }
    return telemetryUrl.toString();
  }

  private async send(events: unknown[], telemetryUrl: string) {
    const {
      cluster_name: clusterName,
      cluster_uuid: clusterUuid,
      version: clusterVersion,
    } = this.clusterInfo ?? {};

    // using ndjson so that each line will be wrapped in json envelope on server side
    // see https://github.com/elastic/infra/blob/master/docs/telemetry/telemetry-next-dataflow.md#json-envelope
    const ndjson = this.transformDataToNdjson(events);

    try {
      const resp = await axios.post(telemetryUrl, ndjson, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          ...(clusterUuid ? { 'X-Elastic-Cluster-ID': clusterUuid } : undefined),
          ...(clusterName ? { 'X-Elastic-Cluster-Name': clusterName } : undefined),
          'X-Elastic-Stack-Version': clusterVersion?.number ? clusterVersion.number : '8.2.0',
        },
        timeout: 5000,
      });
      this.logger.debug(`Events sent!. Response: ${resp.status} ${JSON.stringify(resp.data)}`);
    } catch (err) {
      this.logger.debug(
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
