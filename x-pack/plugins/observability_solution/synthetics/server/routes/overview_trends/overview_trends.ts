/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { TrendKey } from '../../../common/types';
import { getFetchTrendsQuery } from './fetch_trends';

interface TrendAggs {
  aggregations: {
    byId: {
      buckets: Array<{
        key: string;
        byLocation: {
          buckets: Array<{
            key: string;
            last_50: {
              hits: {
                hits: Array<{
                  _source: {
                    monitor: {
                      duration: {
                        us: number;
                      };
                    };
                  };
                }>;
              };
            };
            stats: {};
            median: {
              values: {
                '50.0': number;
              };
            };
          }>;
        };
      }>;
    };
  };
}

export const createOverviewTrendsRoute = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.OVERVIEW_TRENDS,
  validate: {
    body: schema.arrayOf(
      schema.object({
        configId: schema.string(),
        locationId: schema.string(),
      })
    ),
  },
  handler: async (routeContext) => {
    const esClient = routeContext.syntheticsEsClient;
    const body = routeContext.request.body as TrendKey[];
    const configs = body.reduce((acc: Record<string, string[]>, { configId, locationId }) => {
      if (!acc[configId]) {
        acc[configId] = [locationId];
      } else {
        acc[configId].push(locationId);
      }
      return acc;
    }, {});

    const requests = Object.keys(configs).map((key) => getFetchTrendsQuery(key, configs[key]));
    const results = await esClient.msearch(requests);

    let main = {};
    for (const res of results.responses as unknown as TrendAggs[]) {
      const aggregations = res.aggregations;
      aggregations.byId.buckets.map(({ key, byLocation }) => {
        const ret: Record<string, any> = {};
        for (const location of byLocation.buckets) {
          ret[key + location.key] = {
            configId: key,
            locationId: location.key,
            data: location.last_50.hits.hits
              .reverse()
              .map((hit: any, x: number) => ({ x, y: hit._source.monitor.duration.us })),
            ...location.stats,
            median: location.median.values['50.0'],
          };
        }
        main = { ...main, ...ret };
      });
    }
    return routeContext.response.ok({ body: main });
  },
});
