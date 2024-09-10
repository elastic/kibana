/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
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
  getRulesSettingsClientWithRequest(request: KibanaRequest): RulesSettingsClientApi;
}

interface Settings {
  queryDelaySettings: RulesSettingsQueryDelayProperties;
  flappingSettings: RulesSettingsFlappingProperties;
}

export class RulesSettingsService {
  private defaultQueryDelaySettings: RulesSettingsQueryDelayProperties;
  private settingsLastUpdated: Map<string, number> = new Map();
  private queryDelaySettings: Map<string, RulesSettingsQueryDelayProperties> = new Map();
  private flappingSettings: Map<string, RulesSettingsFlappingProperties> = new Map();

  constructor(private readonly options: RulesSettingsServiceConstructorOptions) {
    this.defaultQueryDelaySettings = options.isServerless
      ? DEFAULT_SERVERLESS_QUERY_DELAY_SETTINGS
      : DEFAULT_QUERY_DELAY_SETTINGS;
  }

  public async getSettings(request: KibanaRequest, spaceId: string): Promise<Settings> {
    const now = Date.now();
    if (
      this.settingsLastUpdated.has(spaceId) &&
      this.flappingSettings.has(spaceId) &&
      this.queryDelaySettings.has(spaceId)
    ) {
      const lastUpdated = new Date(this.settingsLastUpdated.get(spaceId)!).getTime();
      const currentFlappingSettings = this.flappingSettings.get(spaceId)!;
      const currentQueryDelaySettings = this.queryDelaySettings.get(spaceId)!;

      if (now - lastUpdated >= CACHE_INTERVAL_MS) {
        // cache expired, refetch settings
        try {
          return await this.fetchSettings(request, spaceId, now);
        } catch (err) {
          // return cached settings on error
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

    this.settingsLastUpdated.set(spaceId, now);
    this.flappingSettings.set(spaceId, flappingSettings);
    this.queryDelaySettings.set(spaceId, queryDelaySettings);

    return { flappingSettings, queryDelaySettings };
  }
}
