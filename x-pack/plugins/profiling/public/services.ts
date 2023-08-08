/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpFetchQuery } from '@kbn/core/public';
import { getRoutePaths } from '../common';
import { BaseFlameGraph, createFlameGraph, ElasticFlameGraph } from '../common/flamegraph';
import { TopNFunctions } from '../common/functions';
import type {
  IndicesStorageDetails,
  StorageExplorerHostBreakdownSizeChart,
  StorageExplorerHostDetails,
  StorageExplorerSummary,
} from '../common/storage_explorer';
import { TopNResponse } from '../common/topn';
import type { SetupDataCollectionInstructions } from '../server/lib/setup/get_setup_instructions';
import { AutoAbortedHttpService } from './hooks/use_auto_aborted_http_client';

export interface Services {
  fetchTopN: (params: {
    http: AutoAbortedHttpService;
    type: string;
    timeFrom: number;
    timeTo: number;
    kuery: string;
  }) => Promise<TopNResponse>;
  fetchTopNFunctions: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    startIndex: number;
    endIndex: number;
    kuery: string;
  }) => Promise<TopNFunctions>;
  fetchElasticFlamechart: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    kuery: string;
  }) => Promise<ElasticFlameGraph>;
  fetchHasSetup: (params: {
    http: AutoAbortedHttpService;
  }) => Promise<{ has_setup: boolean; has_data: boolean }>;
  postSetupResources: (params: { http: AutoAbortedHttpService }) => Promise<void>;
  setupDataCollectionInstructions: (params: {
    http: AutoAbortedHttpService;
  }) => Promise<SetupDataCollectionInstructions>;
  fetchStorageExplorerSummary: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    kuery: string;
  }) => Promise<StorageExplorerSummary>;
  fetchStorageExplorerHostBreakdownSizeChart: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    kuery: string;
  }) => Promise<StorageExplorerHostBreakdownSizeChart[]>;
  fetchStorageExplorerHostsDetails: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    kuery: string;
  }) => Promise<StorageExplorerHostDetails[]>;
  fetchStorageExplorerIndicesStorageDetails: (params: {
    http: AutoAbortedHttpService;
  }) => Promise<IndicesStorageDetails>;
}

export function getServices(): Services {
  const paths = getRoutePaths();

  return {
    fetchTopN: async ({ http, type, timeFrom, timeTo, kuery }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
      };
      return (await http.get(`${paths.TopN}/${type}`, { query })) as Promise<TopNResponse>;
    },

    fetchTopNFunctions: async ({ http, timeFrom, timeTo, startIndex, endIndex, kuery }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        startIndex,
        endIndex,
        kuery,
      };
      return (await http.get(paths.TopNFunctions, { query })) as Promise<TopNFunctions>;
    },

    fetchElasticFlamechart: async ({ http, timeFrom, timeTo, kuery }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
      };
      const baseFlamegraph = (await http.get(paths.Flamechart, { query })) as BaseFlameGraph;
      return createFlameGraph(baseFlamegraph);
    },
    fetchHasSetup: async ({ http }) => {
      const hasSetup = (await http.get(paths.HasSetupESResources, {})) as {
        has_setup: boolean;
        has_data: boolean;
      };
      return hasSetup;
    },
    postSetupResources: async ({ http }) => {
      await http.post(paths.HasSetupESResources, {});
    },
    setupDataCollectionInstructions: async ({ http }) => {
      const instructions = (await http.get(
        paths.SetupDataCollectionInstructions,
        {}
      )) as SetupDataCollectionInstructions;
      return instructions;
    },
    fetchStorageExplorerSummary: async ({ http, timeFrom, timeTo, kuery }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
      };
      const summary = (await http.get(paths.StorageExplorerSummary, {
        query,
      })) as StorageExplorerSummary;
      return summary;
    },
    fetchStorageExplorerHostBreakdownSizeChart: async ({ http, timeFrom, timeTo, kuery }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
      };
      const eventsMetricsSizeTimeseries = (await http.get(
        paths.StorageExplorerHostBreakdownSizeChart,
        { query }
      )) as StorageExplorerHostBreakdownSizeChart[];
      return eventsMetricsSizeTimeseries;
    },
    fetchStorageExplorerHostsDetails: async ({ http, timeFrom, timeTo, kuery }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
      };
      const eventsMetricsSizeTimeseries = (await http.get(paths.StorageExplorerHostDetails, {
        query,
      })) as StorageExplorerHostDetails[];
      return eventsMetricsSizeTimeseries;
    },
    fetchStorageExplorerIndicesStorageDetails: async ({ http }) => {
      const eventsMetricsSizeTimeseries = (await http.get(
        paths.StorageExplorerIndicesStorageDetails,
        {}
      )) as IndicesStorageDetails;
      return eventsMetricsSizeTimeseries;
    },
  };
}
