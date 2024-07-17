/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type LDClient,
  type LDFlagSet,
  type LDLogLevel,
  type LDSingleKindContext,
} from '@launchdarkly/node-server-sdk';
import { init, basicLogger } from '@launchdarkly/node-server-sdk';
import type { Logger } from '@kbn/core/server';

export interface LaunchDarklyClientConfig {
  sdk_key: string;
  client_id: string;
  client_log_level: LDLogLevel;
  kibana_version: string;
}

export interface LaunchDarklyUserMetadata
  extends Record<string, string | boolean | number | undefined> {
  userId: string;
  // We are not collecting any of the above, but this is to match the LDUser first-level definition
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  ip?: string;
  country?: string;
}

export interface LaunchDarklyGetAllFlags {
  initialized: boolean;
  flags: LDFlagSet;
  flagNames: string[];
}

export class LaunchDarklyClient {
  private readonly launchDarklyClient: LDClient;
  private launchDarklyUser?: LDSingleKindContext;

  constructor(ldConfig: LaunchDarklyClientConfig, private readonly logger: Logger) {
    this.launchDarklyClient = init(ldConfig.sdk_key, {
      application: { id: `kibana-server`, version: ldConfig.kibana_version },
      logger: basicLogger({ level: ldConfig.client_log_level }),
      // For some reason, the stream API does not work in Kibana. `.waitForInitialization()` hangs forever (doesn't throw, neither logs any errors).
      // Using polling for now until we resolve that issue.
      // Relevant issue: https://github.com/launchdarkly/node-server-sdk/issues/132
      stream: false,
    });
    this.launchDarklyClient.waitForInitialization().then(
      () => this.logger.debug('LaunchDarkly is initialized!'),
      (err) => this.logger.warn(`Error initializing LaunchDarkly: ${err}`)
    );
  }

  public updateUserMetadata(userMetadata: LaunchDarklyUserMetadata) {
    const { userId, ...userMetadataWithoutUserId } = userMetadata;
    this.launchDarklyUser = {
      ...userMetadataWithoutUserId,
      kind: 'user',
      key: userId,
    };
  }

  public async getVariation<Data>(configKey: string, defaultValue: Data): Promise<Data> {
    if (!this.launchDarklyUser) return defaultValue; // Skip any action if no LD User is defined
    await this.launchDarklyClient.waitForInitialization();
    return await this.launchDarklyClient.variation(configKey, this.launchDarklyUser, defaultValue);
  }

  public reportMetric(metricName: string, meta?: unknown, value?: number): void {
    if (!this.launchDarklyUser) return; // Skip any action if no LD User is defined
    this.launchDarklyClient.track(metricName, this.launchDarklyUser, meta, value);
  }

  public async getAllFlags(): Promise<LaunchDarklyGetAllFlags> {
    if (!this.launchDarklyUser) return { initialized: false, flagNames: [], flags: {} };
    // According to the docs, this method does not send analytics back to LaunchDarkly, so it does not provide false results
    const flagsState = await this.launchDarklyClient.allFlagsState(this.launchDarklyUser);
    const flags = flagsState.allValues();
    return {
      initialized: flagsState.valid,
      flags,
      flagNames: Object.keys(flags),
    };
  }

  public stop() {
    this.launchDarklyClient?.flush().catch((err) => this.logger.error(err));
  }
}
