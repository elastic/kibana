/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, HttpFetchQuery } from '@kbn/core/public';
import { getRoutePaths } from '../common';
import { ElasticFlameGraph } from '../common/flamegraph';
import { TopNFunctions } from '../common/functions';
import { StackFrameMetadata } from '../common/profiling';
import { TopNResponse } from '../common/topn';

export interface Services {
  fetchTopN: (params: {
    type: string;
    timeFrom: number;
    timeTo: number;
    kuery: string;
  }) => Promise<TopNResponse>;
  fetchTopNFunctions: (params: {
    timeFrom: number;
    timeTo: number;
    startIndex: number;
    endIndex: number;
    kuery: string;
  }) => Promise<TopNFunctions>;
  fetchElasticFlamechart: (params: {
    timeFrom: number;
    timeTo: number;
    kuery: string;
  }) => Promise<ElasticFlameGraph>;
  fetchFrameInformation: (params: {
    frameID: string;
    executableID: string;
  }) => Promise<StackFrameMetadata>;
}

export function getServices(core: CoreStart): Services {
  const paths = getRoutePaths();

  return {
    fetchTopN: async ({ type, timeFrom, timeTo, kuery }) => {
      try {
        const query: HttpFetchQuery = {
          timeFrom,
          timeTo,
          kuery,
        };
        return await core.http.get(`${paths.TopN}/${type}`, { query });
      } catch (e) {
        return e;
      }
    },

    fetchTopNFunctions: async ({
      timeFrom,
      timeTo,
      startIndex,
      endIndex,
      kuery,
    }: {
      timeFrom: number;
      timeTo: number;
      startIndex: number;
      endIndex: number;
      kuery: string;
    }) => {
      try {
        const query: HttpFetchQuery = {
          timeFrom,
          timeTo,
          startIndex,
          endIndex,
          kuery,
        };
        return await core.http.get(paths.TopNFunctions, { query });
      } catch (e) {
        return e;
      }
    },

    fetchElasticFlamechart: async ({
      timeFrom,
      timeTo,
      kuery,
    }: {
      timeFrom: number;
      timeTo: number;
      kuery: string;
    }) => {
      try {
        const query: HttpFetchQuery = {
          timeFrom,
          timeTo,
          kuery,
        };
        return await core.http.get(paths.Flamechart, { query });
      } catch (e) {
        return e;
      }
    },
    fetchFrameInformation: async ({
      frameID,
      executableID,
    }: {
      frameID: string;
      executableID: string;
    }) => {
      try {
        const query: HttpFetchQuery = {
          frameID,
          executableID,
        };
        return await core.http.get(paths.FrameInformation, { query });
      } catch (e) {
        return e;
      }
    },
  };
}
