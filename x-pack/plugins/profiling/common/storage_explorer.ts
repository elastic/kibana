/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface StorageExplorerSummary {
  totalProfilingSizeBytes: number;
  totalSymbolsSizeBytes: number;
  diskSpaceUsedPct: number;
  totalNumberOfDistinctProbabilisticValues: number;
  totalNumberOfHosts: number;
  dailyDataGenerationBytes: number;
}

export interface StorageExplorerHostBreakdownSizeChart {
  hostId: string;
  hostName: string;
  timeseries: Array<{
    x: number;
    y?: number | null;
  }>;
}

export interface StorageExplorerHostDetails {
  hostId: string;
  hostName: string;
  projectId: string;
  probabilisticValues: Array<{ value: number; date: number }>;
  totalEventsSize: number;
  totalMetricsSize: number;
  totalSize: number;
}

export type StorageExplorerIndexNames =
  | 'events'
  | 'stackframes'
  | 'stacktraces'
  | 'executables'
  | 'metrics';
export interface StorageExplorerIndexStats {
  docCount: number;
  sizeInBytes: number;
}
export type StotageExplorerDataBreakdownSize = Record<
  StorageExplorerIndexNames,
  StorageExplorerIndexStats
>;
