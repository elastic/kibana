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
import { BehaviorSubject, filter, firstValueFrom, switchMap } from 'rxjs';
import type { Logger } from '@kbn/logging';

export interface LaunchDarklyClientConfig {
  client_id: string;
  client_log_level: LDLogLevel;
}

export interface LaunchDarklyUserMetadata
  extends Record<string, string | boolean | number | undefined> {
  userId: string;
}

export class LaunchDarklyClient {
  private initialized = false;
  private canceled = false;
  private launchDarklyClientSub$ = new BehaviorSubject<LDClient | null>(null);
  private loadingClient$ = new BehaviorSubject<boolean>(true);
  private launchDarklyClient$ = this.loadingClient$.pipe(
    // To avoid a racing condition when trying to get a variation before the client is ready
    // we use the `switchMap` operator to ensure we only return the client when it has been initialized.
    filter((loading) => !loading),
    switchMap(() => this.launchDarklyClientSub$)
  );

  constructor(
    private readonly ldConfig: LaunchDarklyClientConfig,
    private readonly kibanaVersion: string,
    private readonly logger: Logger
  ) {}

  public async updateUserMetadata(userMetadata: LaunchDarklyUserMetadata) {
    if (this.canceled) return;

    const { userId, ...userMetadataWithoutUserId } = userMetadata;
    const launchDarklyUser: LDSingleKindContext = {
      ...userMetadataWithoutUserId,
      kind: 'user',
      key: userId,
    };

    let launchDarklyClient: LDClient | null = null;
    if (this.initialized) {
      launchDarklyClient = await this.getClient();
    }

    if (launchDarklyClient) {
      await launchDarklyClient.identify(launchDarklyUser);
    } else {
      this.initialized = true;
      const { initialize, basicLogger } = await import('launchdarkly-js-client-sdk');
      launchDarklyClient = initialize(this.ldConfig.client_id, launchDarklyUser, {
        application: { id: 'kibana-browser', version: this.kibanaVersion },
        logger: basicLogger({ level: this.ldConfig.client_log_level }),
      });
      this.launchDarklyClientSub$.next(launchDarklyClient);
      this.loadingClient$.next(false);
    }
  }

  public async getVariation<Data>(configKey: string, defaultValue: Data): Promise<Data> {
    const launchDarklyClient = await this.getClient();
    if (!launchDarklyClient) return defaultValue; // Skip any action if no LD User is defined
    await launchDarklyClient.waitForInitialization();
    return await launchDarklyClient.variation(configKey, defaultValue);
  }

  public reportMetric(metricName: string, meta?: unknown, value?: number): void {
    this.getClient().then((launchDarklyClient) => {
      if (!launchDarklyClient) return; // Skip any action if no LD User is defined
      launchDarklyClient.track(metricName, meta, value);
    });
  }

  public stop() {
    this.getClient().then((launchDarklyClient) => {
      launchDarklyClient?.flush().catch((err) => {
        this.logger.warn(err);
      });
    });
  }

  public cancel() {
    this.initialized = true;
    this.canceled = true;
    this.loadingClient$.next(false);
  }

  private getClient(): Promise<LDClient | null> {
    return firstValueFrom(this.launchDarklyClient$, { defaultValue: null });
  }
}
