/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { usageMetricSavedObjectType } from '../../../common/types';
import { LiveQuerySessionUsage } from '../../usage/types';

export interface RouteUsageMetric {
  queries: number;
  errors: number;
}

export type RouteString = 'live_query';

export const routeStrings: RouteString[] = ['live_query'];

export async function getOrCreateMetricObject<T>(
  soClient: SavedObjectsClientContract,
  route: string
) {
  try {
    return await soClient.get<T>(usageMetricSavedObjectType, route);
  } catch (e) {
    return await soClient.create(
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
}

export async function getCount(soClient: SavedObjectsClientContract, route: RouteString) {
  return await getOrCreateMetricObject<LiveQuerySessionUsage>(soClient, route);
}

export interface CounterValue {
  count: number;
  errors: number;
}

export async function incrementCount(
  soClient: SavedObjectsClientContract,
  route: RouteString,
  key: keyof CounterValue = 'count',
  increment = 1
) {
  const metric = await getOrCreateMetricObject<CounterValue>(soClient, route);
  metric.attributes[key] += increment;
  await soClient.update(usageMetricSavedObjectType, route, metric.attributes);
}

export async function getRouteMetric(soClient: SavedObjectsClientContract, route: RouteString) {
  return (await getCount(soClient, route)).attributes;
}
