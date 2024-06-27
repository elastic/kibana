/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { schema } from '@kbn/config-schema';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { SyntheticsRestApiRouteFactory } from '../types';
import { fetchTrends } from './fetch_trends';

export const createOverviewTrendsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.OVERVIEW_TRENDS,
  validate: {
    body: schema.object({
      body: schema.arrayOf(
        schema.object({
          configId: schema.string(),
          locationId: schema.string(),
        })
      ),
    }),
  },
  handler: async (routeContext): Promise<any> => {
    return withSpan('fetch trends', async () => {
      const esClient = routeContext.uptimeEsClient;
      const body = routeContext.request.body as Array<{ configId: string; locationId: string }>;
      const configs = body.reduce((acc: Record<string, string[]>, { configId, locationId }) => {
        if (!acc[configId]) {
          acc[configId] = [locationId];
        } else {
          acc[configId].push(locationId);
        }
        return acc;
      }, {});
      const results = await Promise.all(
        Object.keys(configs).map((key) => fetchTrends(key, configs[key], esClient))
      );
      let main = {};
      for (const res of results) {
        const aggregations = res.body.aggregations as any;
        aggregations.byId.buckets.map(({ key, byLocation }: { key: string; byLocation: any }) => {
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
    });
  },
});
