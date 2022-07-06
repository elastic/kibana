/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, HttpFetchQuery } from '@kbn/core/public';
import { getRoutePaths } from '../common';
import { ElasticFlameGraph } from '../common/flamegraph';
import { TopNSamples } from '../common/topn';

export interface Services {
  fetchTopN: (
    type: string,
    index: string,
    projectID: number,
    timeFrom: number,
    timeTo: number,
    n: number
  ) => Promise<TopNSamples>;
  fetchElasticFlamechart: (
    index: string,
    projectID: number,
    timeFrom: number,
    timeTo: number,
    n: number
  ) => Promise<ElasticFlameGraph>;
}

export function getServices(core: CoreStart): Services {
  const paths = getRoutePaths();

  return {
    fetchTopN: async (
      type: string,
      index: string,
      projectID: number,
      timeFrom: number,
      timeTo: number,
      n: number
    ) => {
      try {
        const query: HttpFetchQuery = {
          index,
          projectID,
          timeFrom,
          timeTo,
          n,
        };
        return await core.http.get(`${paths.TopN}/${type}`, { query });
      } catch (e) {
        return e;
      }
    },

    fetchElasticFlamechart: async (
      index: string,
      projectID: number,
      timeFrom: number,
      timeTo: number,
      n: number
    ) => {
      try {
        const query: HttpFetchQuery = {
          index,
          projectID,
          timeFrom,
          timeTo,
          n,
        };
        return await core.http.get(paths.FlamechartElastic, { query });
      } catch (e) {
        return e;
      }
    },
  };
}
