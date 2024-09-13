/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { ObjectType, schema } from '@kbn/config-schema';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { TrendRequest, TrendTable } from '../../../common/types';
import { getFetchTrendsQuery, TrendsQuery } from './fetch_trends';
import { SyntheticsRestApiRouteFactory } from '../types';

export const getIntervalForCheckCount = (schedule: string, numChecks = 50) =>
  Number(schedule) * numChecks;

const respType = t.type({
  aggregations: t.type({
    byId: t.type({
      buckets: t.array(
        t.type({
          key: t.string,
          byLocation: t.type({
            buckets: t.array(
              t.type({
                key: t.string,
                stats: t.type({}),
                median: t.type({ values: t.type({ '50.0': t.number }) }),
                last50: t.type({
                  buckets: t.array(
                    t.type({
                      max: t.type({ value: t.number }),
                    })
                  ),
                }),
              })
            ),
          }),
        })
      ),
    }),
  }),
});

type ResponseType = t.TypeOf<typeof respType>;

function responseTypeGuard(arg: unknown): arg is ResponseType {
  return isRight(respType.decode(arg));
}

export const mapQueryResponse = (res: ResponseType) =>
  res.aggregations.byId.buckets.map(({ key, byLocation }) => {
    const ret: Record<string, any> = {};
    for (const location of byLocation.buckets) {
      ret[String(key) + String(location.key)] = {
        configId: key,
        locationId: location.key,
        data: location.last50.buckets.map((durationBucket, x) => ({
          x,
          y: durationBucket.max.value,
        })),
        ...location.stats,
        median: location.median.values['50.0'],
      };
    }
    return ret;
  });

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
  handler: async (routeContext): Promise<TrendTable> => {
    const esClient = routeContext.syntheticsEsClient;
    const body = routeContext.request.body as TrendRequest[];

    const configs = body.reduce(
      (
        acc: Record<string, { locations: string[]; interval: number }>,
        { configId, locationId, schedule }
      ) => {
        if (!acc[configId]) {
          acc[configId] = { locations: [locationId], interval: getIntervalForCheckCount(schedule) };
        } else {
          acc[configId].locations.push(locationId);
        }
        return acc;
      },
      {}
    );

    const requests = Object.keys(configs).map(
      (key) => getFetchTrendsQuery(key, configs[key].locations, configs[key].interval).body
    );
    const results = await esClient.msearch<TrendsQuery>(requests);

    return results.responses
      .filter((r) => !responseTypeGuard(r))
      .map((r) => mapQueryResponse(r as unknown as ResponseType))
      .reduce((acc, val) => ({ ...acc, ...val }), {});

    let main = {};
    for (const res of results.responses) {
      res.aggregations?.byId.buckets.map(({ key, byLocation }) => {
        const ret: Record<string, any> = {};
        for (const location of byLocation.buckets) {
          ret[String(key) + String(location.key)] = {
            configId: key,
            locationId: location.key,
            data: location.last50.buckets.map((durationBucket, x) => ({
              x,
              y: durationBucket.max.value,
            })),
            ...location.stats,
            median: location.median.values['50.0'],
          };
        }
        main = { ...main, ...ret };
      });
    }
    return main;
  },
});
