/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';

import type { TelemetryPluginStart, TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';
import type { RawAxiosRequestHeaders } from 'axios';
import { type IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import type { ITelemetryReceiver } from './receiver';
import type { ESClusterInfo, ESLicense, TelemetryChannel, TelemetryCounter } from './types';
import { createUsageCounterLabel } from './helpers';

export interface SenderMetadata {
  telemetryUrl: string;
  licenseInfo: ESLicense | undefined;
  clusterInfo: ESClusterInfo | undefined;
  telemetryRequestHeaders: () => RawAxiosRequestHeaders;
  isTelemetryOptedIn(): Promise<boolean>;
  isTelemetryServicesReachable(): Promise<boolean>;
}

export class SenderUtils {
  private readonly usageLabelPrefix: string[] = ['security_telemetry', 'sender'];

  constructor(
    private readonly telemetrySetup?: TelemetryPluginSetup,
    private readonly telemetryStart?: TelemetryPluginStart,
    private readonly receiver?: ITelemetryReceiver,
    private readonly telemetryUsageCounter?: IUsageCounter
  ) {}

  public async fetchSenderMetadata(channel: TelemetryChannel): Promise<SenderMetadata> {
    const [telemetryUrl, licenseInfo] = await Promise.all([
      this.fetchTelemetryUrl(channel),
      this.receiver?.fetchLicenseInfo(),
    ]);
    const clusterInfo = this.receiver?.getClusterInfo();

    const isTelemetryOptedIn = async () => (await this.telemetryStart?.getIsOptedIn()) === true;

    return {
      telemetryUrl,
      licenseInfo,
      clusterInfo,
      telemetryRequestHeaders: () => {
        const clusterName = clusterInfo?.cluster_name;
        const clusterUuid = clusterInfo?.cluster_uuid;
        const clusterVersionNumber = clusterInfo?.version?.number;
        const licenseId = licenseInfo?.uid;

        return {
          'Content-Type': 'application/x-ndjson',
          ...(clusterName ? { 'X-Elastic-Cluster-Name': clusterName } : undefined),
          ...(clusterUuid ? { 'X-Elastic-Cluster-ID': clusterUuid } : undefined),
          'X-Elastic-Stack-Version': clusterVersionNumber ? clusterVersionNumber : '8.0.0',
          ...(licenseId ? { 'X-Elastic-License-ID': licenseId } : {}),
        };
      },
      isTelemetryOptedIn,
      isTelemetryServicesReachable: async () => {
        const isOptedIn = await isTelemetryOptedIn();
        if (!isOptedIn) {
          return false;
        }

        try {
          const telemetryPingUrl = await this.fetchTelemetryPingUrl();
          const resp = await axios.get(telemetryPingUrl, { timeout: 3000 });
          if (resp.status === 200) {
            return true;
          }

          return false;
        } catch (_) {
          return false;
        }
      },
    };
  }

  public incrementCounter(
    counterType: TelemetryCounter,
    incrementBy: number,
    ...tags: string[]
  ): void {
    const counterName = createUsageCounterLabel([...this.usageLabelPrefix, ...tags]);
    this.telemetryUsageCounter?.incrementCounter({ counterName, counterType, incrementBy });
  }

  private async fetchTelemetryUrl(channel: TelemetryChannel): Promise<string> {
    const telemetryUrl = await this.telemetrySetup?.getTelemetryUrl();
    if (!telemetryUrl) {
      throw Error("Couldn't get telemetry URL");
    }
    return this.getV3UrlFromV2(telemetryUrl.toString(), channel);
  }

  private async fetchTelemetryPingUrl(): Promise<string> {
    const telemetryUrl = await this.telemetrySetup?.getTelemetryUrl();
    if (!telemetryUrl) {
      throw Error("Couldn't get telemetry URL");
    }

    telemetryUrl.pathname = `/ping`;
    return telemetryUrl.toString();
  }

  /**
   * This method converts a v2 URL to a v3 URL like:
   *   - https://telemetry.elastic.co/v3/send/my-channel-name
   *   - https://telemetry-staging.elastic.co/v3-dev/send/my-channel-name
   */
  private getV3UrlFromV2(v2url: string, channel: TelemetryChannel): string {
    const url = new URL(v2url);
    if (!url.hostname.includes('staging')) {
      url.pathname = `/v3/send/${channel}`;
    } else {
      url.pathname = `/v3-dev/send/${channel}`;
    }
    return url.toString();
  }
}
