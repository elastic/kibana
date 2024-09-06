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
} from '../../types';
import { withAlertingSpan } from '../lib';

const CACHE_INTERVAL_MS = 60000; // 1 minute cache

interface RulesSettingsServiceOpts {
  isServerless: boolean;
  getRulesSettingsClientWithRequest(request: KibanaRequest): RulesSettingsClientApi;
}

interface Settings {
  queryDelaySettings: RulesSettingsQueryDelayProperties;
  flappingSettings: RulesSettingsFlappingProperties;
}
export class RulesSettingsService {
  private settingsLastUpdated: number;
  private queryDelaySettings: RulesSettingsQueryDelayProperties;
  private flappingSettings: RulesSettingsFlappingProperties = DEFAULT_FLAPPING_SETTINGS;

  constructor(private readonly options: RulesSettingsServiceOpts) {
    this.queryDelaySettings = options.isServerless
      ? DEFAULT_SERVERLESS_QUERY_DELAY_SETTINGS
      : DEFAULT_QUERY_DELAY_SETTINGS;
    this.settingsLastUpdated = Date.now() - CACHE_INTERVAL_MS;
  }

  public async getSettings(fakeRequest: KibanaRequest): Promise<Settings> {
    const lastUpdated = new Date(this.settingsLastUpdated).getTime();
    const now = Date.now();

    if (now - lastUpdated >= CACHE_INTERVAL_MS) {
      // cache expired, refetch settings

      try {
        const rulesSettingsClient = this.options.getRulesSettingsClientWithRequest(fakeRequest);
        this.queryDelaySettings = await withAlertingSpan('alerting:get-query-delay-settings', () =>
          rulesSettingsClient.queryDelay().get()
        );

        this.flappingSettings = await withAlertingSpan('alerting:get-flapping-settings', () =>
          rulesSettingsClient.flapping().get()
        );

        this.settingsLastUpdated = now;
      } catch (err) {
        // return cached settings on error
        return {
          queryDelaySettings: this.queryDelaySettings,
          flappingSettings: this.flappingSettings,
        };
      }
    }

    return { queryDelaySettings: this.queryDelaySettings, flappingSettings: this.flappingSettings };
  }
}
