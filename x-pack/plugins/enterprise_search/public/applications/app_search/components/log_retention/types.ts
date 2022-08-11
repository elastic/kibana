/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum LogRetentionOptions {
  Analytics = 'analytics',
  API = 'api',
  Audit = 'audit',
  Crawler = 'crawler',
}

export interface LogRetention {
  [LogRetentionOptions.Analytics]: LogRetentionSettings;
  [LogRetentionOptions.API]: LogRetentionSettings;
  [LogRetentionOptions.Audit]: LogRetentionSettings;
  [LogRetentionOptions.Crawler]: LogRetentionSettings;
}

export interface LogRetentionPolicy {
  isDefault: boolean;
  minAgeDays: number | null;
}

export interface LogRetentionSettings {
  disabledAt?: string | null;
  enabled?: boolean;
  retentionPolicy?: LogRetentionPolicy | null;
}

export interface LogRetentionServer {
  [LogRetentionOptions.Analytics]: LogRetentionServerSettings;
  [LogRetentionOptions.API]: LogRetentionServerSettings;
  [LogRetentionOptions.Audit]: LogRetentionServerSettings;
  [LogRetentionOptions.Crawler]: LogRetentionServerSettings;
}

export interface LogRetentionServerPolicy {
  is_default: boolean;
  min_age_days: number | null;
}

export interface LogRetentionServerSettings {
  disabled_at: string | null;
  enabled: boolean;
  retention_policy: LogRetentionServerPolicy | null;
}
