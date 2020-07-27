/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import moment from 'moment';
import { InfraSnapshotRequestOptions } from './types';
import { getMetricsAggregations } from './query_helpers';
import { calculateMetricInterval } from '../../utils/calculate_metric_interval';
import {
  SnapshotModel,
  SnapshotModelMetricAggRT,
  InventoryItemType,
} from '../../../common/inventory_models/types';
import { getDatasetForField } from '../../routes/metrics_explorer/lib/get_dataset_for_field';
import { InfraTimerangeInput } from '../../../common/http_api/snapshot_api';
import { ESSearchClient } from '.';
import { getIntervalInSeconds } from '../../utils/get_interval_in_seconds';
import { aggregationsToModulesCache, createIntervalCache } from '../caches';

const createModulesCacheKey = (modules: string[], to: number, nodeType?: InventoryItemType) => {
  const roundedDate = moment(to).startOf('hour').valueOf();
  const modulesKey = uniq(modules).sort().join(',');
  return `${nodeType || 'ALL'}:${modulesKey}: ${roundedDate}`;
};

const createDatasetCacheKey = (fields: string[]) => {
  return uniq(fields).sort().join(',');
};

const createInterval = async (client: ESSearchClient, options: InfraSnapshotRequestOptions) => {
  const { timerange } = options;
  if (timerange.forceInterval && timerange.interval) {
    return getIntervalInSeconds(timerange.interval);
  }
  const aggregations = getMetricsAggregations(options);
  const modules = await aggregationsToModules(client, aggregations, options);
  const cacheKey = createModulesCacheKey(modules, timerange.to, options.nodeType);
  if (createIntervalCache.has(cacheKey)) {
    return createIntervalCache.get(cacheKey) as number;
  }
  const interval = Math.max(
    (await calculateMetricInterval(
      client,
      {
        indexPattern: options.indexPattern,
        timestampField: options.timerange.field,
        timerange: { from: timerange.from, to: timerange.to },
      },
      modules,
      options.nodeType
    )) || 60,
    60
  );
  createIntervalCache.set(cacheKey, interval);
  return interval;
};

export const createTimeRangeWithInterval = async (
  client: ESSearchClient,
  options: InfraSnapshotRequestOptions
): Promise<InfraTimerangeInput> => {
  const { timerange } = options;
  const calculatedInterval = await createInterval(client, options);
  if (timerange.ignoreLookback) {
    return {
      interval: `${calculatedInterval}s`,
      from: timerange.from,
      to: timerange.to,
      field: timerange.field,
    };
  }
  const lookbackSize = Math.max(timerange.lookbackSize || 5, 5);
  return {
    interval: `${calculatedInterval}s`,
    from: timerange.to - calculatedInterval * lookbackSize * 1000, // We need at least 5 buckets worth of data
    to: timerange.to,
    field: timerange.field,
  };
};

const aggregationsToModules = async (
  client: ESSearchClient,
  aggregations: SnapshotModel,
  options: InfraSnapshotRequestOptions
): Promise<string[]> => {
  const uniqueFields = Object.values(aggregations)
    .reduce<Array<string | undefined>>((fields, agg) => {
      if (SnapshotModelMetricAggRT.is(agg)) {
        return uniq(fields.concat(Object.values(agg).map((a) => a?.field)));
      }
      return fields;
    }, [])
    .filter((v) => v) as string[];
  const cacheKey = createDatasetCacheKey(uniqueFields);
  if (aggregationsToModulesCache.has(cacheKey)) {
    return aggregationsToModulesCache.get(cacheKey) as string[];
  }
  const datasets = await Promise.all(
    uniqueFields.map(
      async (field) => await getDatasetForField(client, field as string, options.indexPattern)
    )
  );
  const modules = datasets.filter((f) => f) as string[];
  aggregationsToModulesCache.set(cacheKey, uniq(modules));
  return uniq(modules);
};
