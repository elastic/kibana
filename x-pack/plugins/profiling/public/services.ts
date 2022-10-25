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
import { TopNResponse } from '../common/topn';
import { AutoAbortedHttpService } from './hooks/use_async';

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
}

export function getServices(): Services {
  const paths = getRoutePaths();

  return {
    fetchTopN: async ({ http, type, timeFrom, timeTo, kuery }) => {
      try {
        const query: HttpFetchQuery = {
          timeFrom,
          timeTo,
          kuery,
        };
        return await http.get(`${paths.TopN}/${type}`, { query });
      } catch (e) {
        return e;
      }
    },

    fetchTopNFunctions: async ({ http, timeFrom, timeTo, startIndex, endIndex, kuery }) => {
      try {
        const query: HttpFetchQuery = {
          timeFrom,
          timeTo,
          startIndex,
          endIndex,
          kuery,
        };
        return await http.get(paths.TopNFunctions, { query });
      } catch (e) {
        return e;
      }
    },

    fetchElasticFlamechart: async ({ http, timeFrom, timeTo, kuery }) => {
      try {
        const query: HttpFetchQuery = {
          timeFrom,
          timeTo,
          kuery,
        };
        const baseFlamegraph = (await http.get(paths.Flamechart, { query })) as BaseFlameGraph;
        return createFlameGraph(baseFlamegraph);
      } catch (e) {
        return e;
      }
    },
  };
}
