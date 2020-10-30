/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum ELogRetentionOptions {
  Analytics = 'analytics',
  API = 'api',
}

export interface ILogRetention {
  [ELogRetentionOptions.Analytics]?: ILogRetentionSettings;
  [ELogRetentionOptions.API]?: ILogRetentionSettings;
}

export interface ILogRetentionPolicy {
  isDefault: boolean;
  minAgeDays: number | null;
}

export interface ILogRetentionSettings {
  disabledAt?: string | null;
  enabled?: boolean;
  retentionPolicy?: ILogRetentionPolicy | null;
}
