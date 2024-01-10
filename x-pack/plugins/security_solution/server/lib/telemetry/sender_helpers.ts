/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TelemetryPluginSetup } from '@kbn/telemetry-plugin/server';
import type { RawAxiosRequestHeaders } from 'axios';
import type { ITelemetryReceiver } from './receiver';
import type { ESClusterInfo, ESLicense } from './types';

export interface SenderMetadata {
  telemetryUrl: string;
  licenseInfo: ESLicense | undefined;
  clusterInfo: ESClusterInfo | undefined;
  telemetryRequestHeaders: () => RawAxiosRequestHeaders;
}

export class SenderUtils {
  constructor(
    private readonly telemetrySetup?: TelemetryPluginSetup,
    private readonly receiver?: ITelemetryReceiver
  ) {}

  public async fetchSenderMetadata(channel: string): Promise<SenderMetadata> {
    const [telemetryUrl, licenseInfo] = await Promise.all([
      this.fetchTelemetryUrl(channel),
      this.receiver?.fetchLicenseInfo(),
    ]);
    const clusterInfo = this.receiver?.getClusterInfo();

    return {
      telemetryUrl,
      licenseInfo,
      clusterInfo,
      telemetryRequestHeaders: () => {
        const clusterName = clusterInfo?.cluster_name;
        const clusterVersionNumber = clusterInfo?.version?.number;
        const licenseId = licenseInfo?.uid;

        return {
          'Content-Type': 'application/x-ndjson',
          ...(clusterName ? { 'X-Elastic-Cluster-Name': clusterName } : undefined),
          'X-Elastic-Stack-Version': clusterVersionNumber ? clusterVersionNumber : '8.0.0',
          ...(licenseId ? { 'X-Elastic-License-ID': licenseId } : {}),
        };
      },
    };
  }

  private async fetchTelemetryUrl(channel: string): Promise<string> {
    const telemetryUrl = await this.telemetrySetup?.getTelemetryUrl();
    if (!telemetryUrl) {
      throw Error("Couldn't get telemetry URL");
    }
    return this.getV3UrlFromV2(telemetryUrl.toString(), channel);
  }

  /**
   * This method converts a v2 URL to a v3 URL like:
   *   - https://telemetry.elastic.co/v3/send/my-channel-name
   *   - https://telemetry-staging.elastic.co/v3-dev/send/my-channel-name
   */
  private getV3UrlFromV2(v2url: string, channel: string): string {
    const url = new URL(v2url);
    if (!url.hostname.includes('staging')) {
      url.pathname = `/v3/send/${channel}`;
    } else {
      url.pathname = `/v3-dev/send/${channel}`;
    }
    return url.toString();
  }
}
