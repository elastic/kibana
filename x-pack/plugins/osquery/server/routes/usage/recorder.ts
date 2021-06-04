/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { usageMetricSavedObjectType } from '../../../common/types';
import { LiveQuerySessionUsage } from '../../usage/types';

export interface RouteUsageMetric {
  queries: number;
  errors: number;
}

export type RouteString = 'live_query';

export async function createMetricObjects(soClient: SavedObjectsClientContract) {
  const res = await Promise.allSettled(
    ['live_query'].map(async (route) => {
      try {
        await soClient.get(usageMetricSavedObjectType, route);
      } catch (e) {
        await soClient.create(
          usageMetricSavedObjectType,
          {
            errors: 0,
            count: 0,
          },
          {
            id: route,
          }
        );
      }
    })
  );
  return !res.some((e) => e.status === 'rejected');
}

export async function getCount(soClient: SavedObjectsClientContract, route: RouteString) {
  return await soClient.get<LiveQuerySessionUsage>(usageMetricSavedObjectType, route);
}

export async function incrementCount(
  soClient: SavedObjectsClientContract,
  route: RouteString,
  key: 'errors' | 'count' = 'count',
  increment = 1
) {
  const metric = await soClient.get<{ count: number; errors: number }>(
    usageMetricSavedObjectType,
    route
  );
  metric.attributes[key] += increment;
  await soClient.update(usageMetricSavedObjectType, route, metric.attributes);
}

export async function getRouteMetric(soClient: SavedObjectsClientContract, route: RouteString) {
  return (await getCount(soClient, route)).attributes;
}
