/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from '@kbn/core/server';
import {
  DEFAULT_FLAPPING_SETTINGS,
  DEFAULT_QUERY_DELAY_SETTINGS,
  DEFAULT_SERVERLESS_QUERY_DELAY_SETTINGS,
  RulesSettingsClientApi,
  RulesSettingsFlappingProperties,
  RulesSettingsQueryDelayProperties,
} from '../types';
import { withAlertingSpan } from '../task_runner/lib';

const CACHE_INTERVAL_MS = 60000; // 1 minute cache

export interface RulesSettingsServiceConstructorOptions {
  readonly isServerless: boolean;
  logger: Logger;
  getRulesSettingsClientWithRequest(request: KibanaRequest): RulesSettingsClientApi;
}

interface Settings {
  queryDelaySettings: RulesSettingsQueryDelayProperties;
  flappingSettings: RulesSettingsFlappingProperties;
}

type LastUpdatedSettings = Settings & { lastUpdated: number };

export class RulesSettingsService {
  private defaultQueryDelaySettings: RulesSettingsQueryDelayProperties;
  private settings: Map<string, LastUpdatedSettings> = new Map();

  constructor(private readonly options: RulesSettingsServiceConstructorOptions) {
    this.defaultQueryDelaySettings = options.isServerless
      ? DEFAULT_SERVERLESS_QUERY_DELAY_SETTINGS
      : DEFAULT_QUERY_DELAY_SETTINGS;
  }

  public async getSettings(request: KibanaRequest, spaceId: string): Promise<Settings> {
    const now = Date.now();
    if (this.settings.has(spaceId)) {
      const settingsFromLastUpdate = this.settings.get(spaceId)!;
      const lastUpdated = new Date(settingsFromLastUpdate.lastUpdated).getTime();
      const currentFlappingSettings = settingsFromLastUpdate.flappingSettings;
      const currentQueryDelaySettings = settingsFromLastUpdate.queryDelaySettings;

      if (now - lastUpdated >= CACHE_INTERVAL_MS) {
        // cache expired, refetch settings
        try {
          return await this.fetchSettings(request, spaceId, now);
        } catch (err) {
          // return cached settings on error
          this.options.logger.debug(
            `Failed to fetch rules settings after cache expiration, using cached settings: ${err.message}`
          );
          return {
            queryDelaySettings: currentQueryDelaySettings,
            flappingSettings: currentFlappingSettings,
          };
        }
      } else {
        return {
          queryDelaySettings: currentQueryDelaySettings,
          flappingSettings: currentFlappingSettings,
        };
      }
    } else {
      // nothing in cache, fetch settings
      try {
        return await this.fetchSettings(request, spaceId, now);
      } catch (err) {
        // return default settings on error
        this.options.logger.debug(
          `Failed to fetch initial rules settings, using default settings: ${err.message}`
        );
        return {
          queryDelaySettings: this.defaultQueryDelaySettings,
          flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        };
      }
    }
  }

  private async fetchSettings(
    request: KibanaRequest,
    spaceId: string,
    now: number
  ): Promise<Settings> {
    const rulesSettingsClient = this.options.getRulesSettingsClientWithRequest(request);
    const queryDelaySettings = await withAlertingSpan('alerting:get-query-delay-settings', () =>
      rulesSettingsClient.queryDelay().get()
    );

    const flappingSettings = await withAlertingSpan('alerting:get-flapping-settings', () =>
      rulesSettingsClient.flapping().get()
    );

    this.settings.set(spaceId, { lastUpdated: now, queryDelaySettings, flappingSettings });

    return { flappingSettings, queryDelaySettings };
  }
}
