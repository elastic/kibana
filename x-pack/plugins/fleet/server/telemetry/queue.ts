/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { Logger } from 'src/core/server';

import axios from 'axios';

import type { ESClusterInfo, TelemetryEvent } from './types';

export const TELEMETRY_MAX_BUFFER_SIZE = 100;

export class TelemetryQueue {
  private maxQueueSize = TELEMETRY_MAX_BUFFER_SIZE;
  private queue: TelemetryEvent[] = [];
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public addEvents(events: TelemetryEvent[]) {
    const qlength = this.queue.length;

    if (events.length === 0) {
      return;
    }

    // do not add events with same id
    events = events.filter(
      (event) => !this.queue.find((qItem) => qItem.id && event.id && qItem.id === event.id)
    );

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

  public clearEvents() {
    this.queue = [];
  }

  public async sendEvents(telemetryUrl: string, clusterInfo: ESClusterInfo | undefined) {
    if (this.queue.length === 0) {
      return;
    }

    try {
      this.logger.debug(`Telemetry URL: ${telemetryUrl}`);

      const toSend: TelemetryEvent[] = cloneDeep(this.queue).map((event) => ({
        ...event,
        cluster_uuid: clusterInfo?.cluster_uuid,
        cluster_name: clusterInfo?.cluster_name,
      }));
      this.queue = [];

      this.logger.debug(JSON.stringify(toSend));

      await this.send(
        toSend,
        telemetryUrl,
        clusterInfo?.cluster_uuid,
        clusterInfo?.version?.number
      );
    } catch (err) {
      this.logger.warn(`Error sending telemetry events data: ${err}`);
      this.queue = [];
    }
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
