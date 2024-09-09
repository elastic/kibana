/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  IndexLifecyclePhaseSelectOption,
  indexLifeCyclePhaseToDataTier,
} from '@kbn/observability-shared-plugin/common';
import * as t from 'io-ts';

export { IndexLifecyclePhaseSelectOption, type indexLifeCyclePhaseToDataTier };
export const indexLifecyclePhaseRt = t.type({
  indexLifecyclePhase: t.union([
    t.literal(IndexLifecyclePhaseSelectOption.All),
    t.literal(IndexLifecyclePhaseSelectOption.Hot),
    t.literal(IndexLifecyclePhaseSelectOption.Warm),
    t.literal(IndexLifecyclePhaseSelectOption.Cold),
    t.literal(IndexLifecyclePhaseSelectOption.Frozen),
  ]),
});

export interface StorageExplorerSummaryAPIResponse {
  totalProfilingSizeBytes: number;
  totalSymbolsSizeBytes: number;
  diskSpaceUsedPct: number;
  totalNumberOfDistinctProbabilisticValues: number;
  totalNumberOfHosts: number;
  dailyDataGenerationBytes: number;
}

export interface StorageExplorerHostDetailsTimeseries {
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
  probabilisticValues: Array<{ value: number; date: number | null }>;
  totalEventsSize: number;
  totalMetricsSize: number;
  totalSize: number;
}

export interface StorageHostDetailsAPIResponse {
  hostDetailsTimeseries: StorageExplorerHostDetailsTimeseries[];
  hostDetails: StorageExplorerHostDetails[];
}

export type StorageGroupedIndexNames =
  | 'events'
  | 'stackframes'
  | 'stacktraces'
  | 'executables'
  | 'metrics';

export interface StorageDetailsGroupedByIndex {
  indexName: StorageGroupedIndexNames;
  docCount: number;
  sizeInBytes: number;
}

export interface StorageDetailsPerIndex {
  indexName: string;
  docCount?: number;
  primaryShardsCount?: number;
  replicaShardsCount?: number;
  sizeInBytes?: number;
  dataStream?: string;
  lifecyclePhase?: string;
}

export interface IndicesStorageDetailsAPIResponse {
  storageDetailsGroupedByIndex: StorageDetailsGroupedByIndex[];
  storageDetailsPerIndex: StorageDetailsPerIndex[];
}
