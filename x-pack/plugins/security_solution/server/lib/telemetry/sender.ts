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
  data_stream?: {
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
  license?: ESLicense;
}

export class TelemetryEventsSender {
  private readonly initialCheckDelayMs = 10 * 1000;
  private readonly checkIntervalMs = 60 * 1000;
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

      const [telemetryUrl, clusterInfo, licenseInfo] = await Promise.all([
        this.fetchTelemetryUrl(),
        this.fetchClusterInfo(),
        this.fetchLicenseInfo(),
      ]);

      this.logger.debug(`Telemetry URL: ${telemetryUrl}`);
      this.logger.debug(
        `cluster_uuid: ${clusterInfo?.cluster_uuid} cluster_name: ${clusterInfo?.cluster_name}`
      );

      const toSend: TelemetryEvent[] = cloneDeep(this.queue).map((event) => ({
        ...event,
        ...(licenseInfo ? { license: this.copyLicenseFields(licenseInfo) } : {}),
        cluster_uuid: clusterInfo.cluster_uuid,
        cluster_name: clusterInfo.cluster_name,
      }));
      this.queue = [];

      await this.sendEvents(
        toSend,
        telemetryUrl,
        clusterInfo.cluster_uuid,
        clusterInfo.version?.number,
        licenseInfo?.uid
      );
    } catch (err) {
      this.logger.warn(`Error sending telemetry events data: ${err}`);
      this.queue = [];
    }
    this.isSending = false;
  }

  private async fetchClusterInfo(): Promise<ESClusterInfo> {
    if (!this.core) {
      throw Error("Couldn't fetch cluster info because core is not available");
    }
    const callCluster = this.core.elasticsearch.legacy.client.callAsInternalUser;
    return getClusterInfo(callCluster);
  }

  private async fetchTelemetryUrl(): Promise<string> {
    const telemetryUrl = await this.telemetrySetup?.getTelemetryUrl();
    if (!telemetryUrl) {
      throw Error("Couldn't get telemetry URL");
    }
    return getV3UrlFromV2(telemetryUrl.toString(), 'alerts-endpoint');
  }

  private async fetchLicenseInfo(): Promise<ESLicense | undefined> {
    if (!this.core) {
      return undefined;
    }
    try {
      const callCluster = this.core.elasticsearch.legacy.client.callAsInternalUser;
      const ret = await getLicense(callCluster, true);
      return ret.license;
    } catch (err) {
      this.logger.warn(`Error retrieving license: ${err}`);
      return undefined;
    }
  }

  private copyLicenseFields(lic: ESLicense) {
    return {
      uid: lic.uid,
      status: lic.status,
      type: lic.type,
      ...(lic.issued_to ? { issued_to: lic.issued_to } : {}),
      ...(lic.issuer ? { issuer: lic.issuer } : {}),
    };
  }

  private async sendEvents(
    events: unknown[],
    telemetryUrl: string,
    clusterUuid: string,
    clusterVersionNumber: string | undefined,
    licenseId: string | undefined
  ) {
    // this.logger.debug(`Sending events: ${JSON.stringify(events, null, 2)}`);
    const ndjson = transformDataToNdjson(events);
    // this.logger.debug(`NDJSON: ${ndjson}`);

    try {
      const resp = await axios.post(telemetryUrl, ndjson, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'X-Elastic-Cluster-ID': clusterUuid,
          'X-Elastic-Stack-Version': clusterVersionNumber ? clusterVersionNumber : '7.10.0',
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
  return Object.entries(allowlist).reduce<TelemetryEvent>((newEvent, [allowKey, allowValue]) => {
    const eventValue = event[allowKey];
    if (eventValue) {
      if (allowValue === true) {
        return { ...newEvent, [allowKey]: eventValue };
      } else if (typeof allowValue === 'object' && typeof eventValue === 'object') {
        const values = copyAllowlistedFields(allowValue, eventValue as TelemetryEvent);
        return {
          ...newEvent,
          ...(Object.keys(values).length > 0 ? { [allowKey]: values } : {}),
        };
      }
    }
    return newEvent;
  }, {});
}

// Forms URLs like:
// https://telemetry.elastic.co/v3/send/my-channel-name or
// https://telemetry-staging.elastic.co/v3-dev/send/my-channel-name
export function getV3UrlFromV2(v2url: string, channel: string): string {
  const url = new URL(v2url);
  if (!url.hostname.includes('staging')) {
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
  version?: {
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
function getClusterInfo(callCluster: LegacyAPICaller) {
  return callCluster<ESClusterInfo>('info');
}

// From https://www.elastic.co/guide/en/elasticsearch/reference/current/get-license.html
export interface ESLicense {
  status: string;
  uid: string;
  type: string;
  issue_date?: string;
  issue_date_in_millis?: number;
  expiry_date?: string;
  expirty_date_in_millis?: number;
  max_nodes?: number;
  issued_to?: string;
  issuer?: string;
  start_date_in_millis?: number;
}

function getLicense(callCluster: LegacyAPICaller, local: boolean) {
  return callCluster<{ license: ESLicense }>('transport.request', {
    method: 'GET',
    path: '/_license',
    query: {
      local,
      // For versions >= 7.6 and < 8.0, this flag is needed otherwise 'platinum' is returned for 'enterprise' license.
      accept_enterprise: 'true',
    },
  });
}
