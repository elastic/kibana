/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type LDClient,
  type LDSingleKindContext,
  type LDLogLevel,
} from 'launchdarkly-js-client-sdk';

export interface LaunchDarklyClientConfig {
  client_id: string;
  client_log_level: LDLogLevel;
}

export interface LaunchDarklyUserMetadata
  extends Record<string, string | boolean | number | undefined> {
  userId: string;
}

export class LaunchDarklyClient {
  private launchDarklyClient?: LDClient;

  constructor(
    private readonly ldConfig: LaunchDarklyClientConfig,
    private readonly kibanaVersion: string
  ) {}

  public async updateUserMetadata(userMetadata: LaunchDarklyUserMetadata) {
    const { userId, ...userMetadataWithoutUserId } = userMetadata;
    const launchDarklyUser: LDSingleKindContext = {
      ...userMetadataWithoutUserId,
      kind: 'user',
      key: userId,
    };
    if (this.launchDarklyClient) {
      await this.launchDarklyClient.identify(launchDarklyUser);
    } else {
      const { initialize, basicLogger } = await import('launchdarkly-js-client-sdk');
      this.launchDarklyClient = initialize(this.ldConfig.client_id, launchDarklyUser, {
        application: { id: 'kibana-browser', version: this.kibanaVersion },
        logger: basicLogger({ level: this.ldConfig.client_log_level }),
      });
    }
  }

  public async getVariation<Data>(configKey: string, defaultValue: Data): Promise<Data> {
    if (!this.launchDarklyClient) return defaultValue; // Skip any action if no LD User is defined
    await this.launchDarklyClient.waitForInitialization();
    return await this.launchDarklyClient.variation(configKey, defaultValue);
  }

  public reportMetric(metricName: string, meta?: unknown, value?: number): void {
    if (!this.launchDarklyClient) return; // Skip any action if no LD User is defined
    this.launchDarklyClient.track(metricName, meta, value);
  }

  public stop() {
    this.launchDarklyClient
      ?.flush()
      // eslint-disable-next-line no-console
      .catch((err) => console.warn(err));
  }
}
