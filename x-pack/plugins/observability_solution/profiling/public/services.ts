/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchQuery } from '@kbn/core/public';
import {
  createFlameGraph,
  TopNFunctions,
  type BaseFlameGraph,
  type ElasticFlameGraph,
} from '@kbn/profiling-utils';
import { getRoutePaths } from '../common';
import type {
  IndexLifecyclePhaseSelectOption,
  IndicesStorageDetailsAPIResponse,
  StorageExplorerSummaryAPIResponse,
  StorageHostDetailsAPIResponse,
} from '../common/storage_explorer';
import { TopNResponse } from '../common/topn';
import type { SetupDataCollectionInstructions } from '../server/routes/setup/get_cloud_setup_instructions';
import { AutoAbortedHttpService } from './hooks/use_auto_aborted_http_client';

type APMTransactions = Array<{
  serviceName: string;
  transactionName: string | null;
}>;

export interface ProfilingSetupStatus {
  has_setup: boolean;
  has_data: boolean;
  pre_8_9_1_data: boolean;
  has_required_role: boolean;
  unauthorized?: boolean;
}

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
    showErrorFrames: boolean;
  }) => Promise<ElasticFlameGraph>;
  fetchHasSetup: (params: { http: AutoAbortedHttpService }) => Promise<ProfilingSetupStatus>;
  postSetupResources: (params: { http: AutoAbortedHttpService }) => Promise<void>;
  setupDataCollectionInstructions: (params: {
    http: AutoAbortedHttpService;
  }) => Promise<SetupDataCollectionInstructions>;
  fetchStorageExplorerSummary: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    kuery: string;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  }) => Promise<StorageExplorerSummaryAPIResponse>;
  fetchStorageExplorerHostStorageDetails: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    kuery: string;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  }) => Promise<StorageHostDetailsAPIResponse>;
  fetchStorageExplorerIndicesStorageDetails: (params: {
    http: AutoAbortedHttpService;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  }) => Promise<IndicesStorageDetailsAPIResponse>;
  fetchTopNFunctionAPMTransactions: (params: {
    http: AutoAbortedHttpService;
    timeFrom: number;
    timeTo: number;
    functionName: string;
    serviceNames: string[];
  }) => Promise<APMTransactions>;
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

    fetchElasticFlamechart: async ({ http, timeFrom, timeTo, kuery, showErrorFrames }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
      };

      const baseFlamegraph = (await http.get(paths.Flamechart, { query })) as BaseFlameGraph;
      return createFlameGraph(baseFlamegraph, showErrorFrames);
    },
    fetchHasSetup: async ({ http }) => {
      const hasSetup = (await http.get(paths.HasSetupESResources, {})) as ProfilingSetupStatus;
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
    fetchStorageExplorerSummary: async ({ http, timeFrom, timeTo, kuery, indexLifecyclePhase }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
        indexLifecyclePhase,
      };
      const summary = (await http.get(paths.StorageExplorerSummary, {
        query,
      })) as StorageExplorerSummaryAPIResponse;
      return summary;
    },
    fetchStorageExplorerHostStorageDetails: async ({
      http,
      timeFrom,
      timeTo,
      kuery,
      indexLifecyclePhase,
    }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        kuery,
        indexLifecyclePhase,
      };
      const eventsMetricsSizeTimeseries = (await http.get(paths.StorageExplorerHostStorageDetails, {
        query,
      })) as StorageHostDetailsAPIResponse;
      return eventsMetricsSizeTimeseries;
    },
    fetchStorageExplorerIndicesStorageDetails: async ({ http, indexLifecyclePhase }) => {
      const query: HttpFetchQuery = {
        indexLifecyclePhase,
      };
      const eventsMetricsSizeTimeseries = (await http.get(
        paths.StorageExplorerIndicesStorageDetails,
        { query }
      )) as IndicesStorageDetailsAPIResponse;
      return eventsMetricsSizeTimeseries;
    },
    fetchTopNFunctionAPMTransactions: async ({
      functionName,
      http,
      serviceNames,
      timeFrom,
      timeTo,
    }) => {
      const query: HttpFetchQuery = {
        timeFrom,
        timeTo,
        functionName,
        serviceNames: JSON.stringify(serviceNames),
      };
      return (await http.get(paths.APMTransactions, {
        query,
      })) as Promise<APMTransactions>;
    },
  };
}
