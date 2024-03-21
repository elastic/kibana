/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConnectorStats {
  id: string;
  serviceType?: string | null;
  isNative?: boolean;
  isDeleted: boolean;
  status?: string;
  indexName?: string | null;
  dlsEnabled?: boolean;
  sslEnabled?: boolean;
  fetchSelectively?: boolean;
  textExtractionServiceEnabled?: boolean;
  documents?: DocumentsStats;
  dataSourceSpecific?: DataSourceSpecificStats;
  scheduling?: {
    accessControl: Scheduling;
    full: Scheduling;
    incremental: Scheduling;
  };
  syncRules?: {
    active: {
      withBasicRules: boolean;
      withAdvancedRules: boolean;
    };
    draft: {
      withBasicRules: boolean;
      withAdvancedRules: boolean;
    };
  };
  ingestPipeline?: {
    name: string;
    extractBinaryContent: boolean;
    reduceWhitespace: boolean;
    runMLInference: boolean;
  };
  syncJobs?: SyncJobStats;
}

export interface DataSourceSpecificStats {
  confluence?: {
    dataSourceType: string;
  };
  github?: {
    isCloud: boolean;
  };
  jira?: {
    dataSourceType: string;
  };
  mongodb?: {
    directConnect: boolean;
  };
  mssql?: {
    validateHost: boolean;
    tables: number;
  };
  mysql?: {
    tables: number;
  };
  oracle?: {
    tables: number;
  };
  postgresql?: {
    tables: number;
  };
  slack?: {
    autoJoinChannelsEnabled: boolean;
    syncUsersEnabled: boolean;
    fetchLastNDays: number;
  };
  zoom?: {
    recordingAge: number;
  };
}

export interface DocumentsStats {
  total: number;
  volume: number;
  inLastSync: number;
}

interface Scheduling {
  enabled: boolean;
  interval: string;
}

export interface SyncJobStats {
  overall: SyncJobStatsDetails;
  withTextExtractionServiceEnabled?: SyncJobStatsDetails;
}

export interface SyncJobStatsDetails {
  total: number;
  last30Days?: SyncJobStatsByType;
  last7Days?: SyncJobStatsByType;
}

export interface SyncJobStatsByType {
  overall: SyncJobStatsByState;
  accessControl?: SyncJobStatsByState;
  full?: SyncJobStatsByState;
  incremental?: SyncJobStatsByState;
}

export interface SyncJobStatsByState {
  total: number;
  manual: number;
  scheduled: number;
  completed: number;
  errored: number;
  canceled: number;
  suspended: number;
  idle: number;
  running: number;
  totalDurationSeconds: number;
}
