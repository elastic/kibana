/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type LDClient, type LDUser, type LDLogLevel } from 'launchdarkly-js-client-sdk';
import { defer, Defer } from '@kbn/kibana-utils-plugin/public';

export interface LaunchDarklyClientConfig {
  client_id: string;
  client_log_level: LDLogLevel;
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

export class LaunchDarklyClient {
  private launchDarklyClient?: Promise<LDClient | null>;
  private waitUntilReady: Defer<void> = defer();

  constructor(
    private readonly ldConfig: LaunchDarklyClientConfig,
    private readonly kibanaVersion: string
  ) {}

  public async updateUserMetadata(userMetadata: LaunchDarklyUserMetadata) {
    const { userId, name, firstName, lastName, email, avatar, ip, country, ...custom } =
      userMetadata;
    const launchDarklyUser: LDUser = {
      key: userId,
      name,
      firstName,
      lastName,
      email,
      avatar,
      ip,
      country,
      // This casting is needed because LDUser does not allow `Record<string, undefined>`
      custom: custom as Record<string, string | boolean | number>,
    };
    if (this.launchDarklyClient) {
      await (await this.launchDarklyClient)?.identify(launchDarklyUser);
    } else {
      this.launchDarklyClient = new Promise<LDClient | null>((resolve) => {
        const timeoutHandle = setTimeout(() => {
          // eslint-disable-next-line no-console
          console.warn(`Failed to initialize launchDarkly client: timeout`);
          resolve(null);
          this.waitUntilReady?.resolve();
        }, 10000); // Timeout after 10 seconds
        import('launchdarkly-js-client-sdk')
          .then(({ initialize, basicLogger }) => {
            const client = initialize(this.ldConfig.client_id, launchDarklyUser, {
              application: { id: 'kibana-browser', version: this.kibanaVersion },
              logger: basicLogger({ level: this.ldConfig.client_log_level }),
            });
            resolve(client);
            this.waitUntilReady?.resolve();
          })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.warn(`Failed to initialize launchDarkly client`, err);

            resolve(null);
            this.waitUntilReady?.resolve();
          })
          .finally(() => {
            clearTimeout(timeoutHandle);
          });
      });
      await this.launchDarklyClient;
    }
  }

  public async getVariation<Data>(configKey: string, defaultValue: Data): Promise<Data> {
    if (this.waitUntilReady) await this.waitUntilReady.promise;
    if (!this.launchDarklyClient) return defaultValue; // Skip any action if no LD User is defined
    const client = await this.launchDarklyClient;
    if (!client) return defaultValue;
    try {
      await client.waitForInitialization();
      return client.variation(configKey, defaultValue);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to get variation for ${configKey}`, e);
      return defaultValue;
    }
  }

  public reportMetric(metricName: string, meta?: unknown, value?: number) {
    if (!this.launchDarklyClient) return; // Skip any action if no LD User is defined
    this.launchDarklyClient.then((client) => {
      client?.track(metricName, meta, value);
    });
  }

  public stop() {
    if (!this.launchDarklyClient) return;
    this.launchDarklyClient.then((client) => {
      client
        ?.flush()
        // eslint-disable-next-line no-console
        .catch((err) => console.warn(err));
    });
  }
}
