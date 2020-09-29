/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import axios from 'axios';
import { LegacyAPICaller } from 'kibana/server';
import { URL } from 'url';
import { Logger, CoreStart } from '../../../../../../src/core/server';
import { transformDataToNdjson } from '../../utils/read_stream/create_stream_from_ndjson';
import {
  TelemetryPluginStart,
  TelemetryPluginSetup,
} from '../../../../../../src/plugins/telemetry/server';

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
      return copyAllowlistedFields(allowlistEventFields, obj);
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

    try {
      this.isSending = true;

      // Checking opt-in status is relatively expensive (calls a saved-object), so
      // we only check it when we have things to send.
      this.isOptedIn = await this.telemetryStart?.getIsOptedIn();
      if (!this.isOptedIn) {
        this.logger.debug(`Telemetry is not opted-in.`);
        this.queue = [];
        this.isSending = false;
        return;
      }

      const telemetryUrl = await this.telemetrySetup?.getTelemetryUrl();
      if (!telemetryUrl) {
        throw new Error("Couldn't get telemetry URL");
      }
      const v3TelemetryUrl = getV3UrlFromV2(telemetryUrl.toString(), 'alerts-debug'); // TODO: update
      this.logger.debug(`Telemetry URL: ${v3TelemetryUrl}`);

      const clusterInfo = await this.fetchClusterInfo();
      if (!clusterInfo) {
        throw new Error("Couldn't get cluster Info");
      }
      this.logger.debug(
        `cluster_uuid: ${clusterInfo?.cluster_uuid} cluster_name: ${clusterInfo?.cluster_name}`
      );

      const toSend: TelemetryEvent[] = cloneDeep(this.queue);
      this.queue = [];

      toSend.forEach((event) => {
        event.cluster_uuid = clusterInfo.cluster_uuid;
        event.cluster_name = clusterInfo.cluster_name;
      });

      await this.sendEvents(toSend, v3TelemetryUrl, clusterInfo.cluster_uuid);
    } catch (err) {
      this.logger.warn(`Error sending telemetry events data: ${err}`);
      // throw err;
      this.queue = [];
    }
    this.isSending = false;
  }

  private async sendEvents(events: unknown[], telemetryUrl: string, clusterUuid: string) {
    // this.logger.debug(`Sending events: ${JSON.stringify(events, null, 2)}`);
    const ndjson = transformDataToNdjson(events);
    // this.logger.debug(`NDJSON: ${ndjson}`);

    try {
      const resp = await axios.post(`${telemetryUrl}?debug=true`, ndjson, {
        // TODO: remove the debug
        headers: {
          'Content-Type': 'application/x-ndjson',
          'X-Elastic-Cluster-ID': clusterUuid,
          'X-Elastic-Telemetry': '1', // TODO: no longer needed?
        },
      });
      this.logger.debug(`Events sent!. Response: ${resp.status} ${resp.data}`);
    } catch (err) {
      this.logger.warn(`Error sending events: ${err.response.status} ${err.response.data}`);
    }
  }

  private async fetchClusterInfo(): Promise<ESClusterInfo | undefined> {
    if (!this.core) {
      return undefined;
    }
    const callCluster = this.core.elasticsearch.legacy.client.callAsInternalUser;
    return getClusterInfo(callCluster);
  }
}

// For the Allowlist definition.
interface AllowlistFields {
  [key: string]: boolean | AllowlistFields;
}

// Allow list for the data we include in the events. True means that it is deep-cloned
// blindly. Object contents means that we only copy the fields that appear explicitly in
// the sub-object.
const allowlistEventFields: AllowlistFields = {
  '@timestamp': true,
  agent: true,
  Endpoint: true,
  ecs: true,
  elastic: true,
  event: true,
  file: {
    name: true,
    path: true,
    size: true,
    created: true,
    accessed: true,
    mtime: true,
    directory: true,
    hash: true,
    Ext: {
      code_signature: true,
      malware_classification: true,
    },
  },
  host: {
    os: true,
  },
  process: {
    name: true,
    executable: true,
    command_line: true,
    hash: true,
    Ext: {
      code_signature: true,
    },
    parent: {
      name: true,
      executable: true,
      command_line: true,
      hash: true,
      Ext: {
        code_signature: true,
      },
    },
  },
};

export function copyAllowlistedFields(
  allowlist: AllowlistFields,
  event: TelemetryEvent
): TelemetryEvent {
  const newEvent: TelemetryEvent = {};
  for (const key in allowlist) {
    if (key in event) {
      if (allowlist[key] === true) {
        newEvent[key] = cloneDeep(event[key]);
      } else if (typeof allowlist[key] === 'object' && typeof event[key] === 'object') {
        const values = copyAllowlistedFields(
          allowlist[key] as AllowlistFields,
          event[key] as TelemetryEvent
        );
        if (Object.keys(values).length > 0) {
          newEvent[key] = values;
        }
      }
    }
  }
  return newEvent;
}

// Forms URLs like:
// https://telemetry.elastic.co/v3/send/my-channel-name or
// https://telemetry-staging.elastic.co/v3-dev/send/my-channel-name
export function getV3UrlFromV2(v2url: string, channel: string): string {
  const url = new URL(v2url);
  if (url.hostname.search('staging') < 0) {
    url.pathname = `/v3/send/${channel}`;
  } else {
    url.pathname = `/v3-dev/send/${channel}`;
  }
  return url.toString();
}

// For getting cluster info. Copied from telemetry_collection/get_cluster_info.ts
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
