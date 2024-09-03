/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObjectType, schema } from '@kbn/config-schema';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { TrendRequest } from '../../../common/types';
import { getFetchTrendsQuery } from './fetch_trends';
import { SyntheticsRestApiRouteFactory } from '../types';

interface TrendAggs {
  aggregations: {
    byId: {
      buckets: Array<{
        key: string;
        byLocation: {
          buckets: Array<{
            key: string;
            last_50: {
              buckets: Array<{
                max: { value: number };
              }>;
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

export const getTimeRangeFilter = (schedule: string, numChecks = 50) =>
  Number(schedule) * numChecks;

export const createOverviewTrendsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.OVERVIEW_TRENDS,
  validate: {
    body: schema.arrayOf(
      schema.object({
        configId: schema.string(),
        locationId: schema.string(),
        schedule: schema.string(),
      })
    ) as unknown as ObjectType,
  },
  handler: async (routeContext) => {
    const esClient = routeContext.syntheticsEsClient;
    const body = routeContext.request.body as TrendRequest[];
    const configs = body.reduce(
      (
        acc: Record<string, { locations: string[]; interval: number }>,
        { configId, locationId, schedule }
      ) => {
        if (!acc[configId]) {
          acc[configId] = { locations: [locationId], interval: getTimeRangeFilter(schedule) };
        } else {
          acc[configId].locations.push(locationId);
        }
        return acc;
      },
      {}
    );

    const requests = Object.keys(configs).map((key) =>
      getFetchTrendsQuery(key, configs[key].locations, configs[key].interval)
    );
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
            data: location.last_50.buckets.map(
              (durationBucket: { max: { value: number } }, x: number) => ({
                x,
                y: durationBucket.max.value,
              })
            ),
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
