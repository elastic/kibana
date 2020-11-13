/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { InfraTimerangeInput } from '../../../../common/http_api';
import { ESSearchClient } from '../../../lib/metrics/types';
import { getIntervalInSeconds } from '../../../utils/get_interval_in_seconds';
import { calculateMetricInterval } from '../../../utils/calculate_metric_interval';
import { getMetricsAggregations, InfraSnapshotRequestOptions } from './get_metrics_aggregations';
import {
  MetricsUIAggregation,
  ESBasicMetricAggRT,
} from '../../../../common/inventory_models/types';
import { getDatasetForField } from '../../metrics_explorer/lib/get_dataset_for_field';

const createInterval = async (client: ESSearchClient, options: InfraSnapshotRequestOptions) => {
  const { timerange } = options;
  if (timerange.forceInterval && timerange.interval) {
    return getIntervalInSeconds(timerange.interval);
  }
  const aggregations = getMetricsAggregations(options);
  const modules = await aggregationsToModules(client, aggregations, options);
  return Math.max(
    (await calculateMetricInterval(
      client,
      {
        indexPattern: options.sourceConfiguration.metricAlias,
        timestampField: options.sourceConfiguration.fields.timestamp,
        timerange: { from: timerange.from, to: timerange.to },
      },
      modules,
      options.nodeType
    )) || 60,
    60
  );
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
    };
  }
  const lookbackSize = Math.max(timerange.lookbackSize || 5, 5);
  return {
    interval: `${calculatedInterval}s`,
    from: timerange.to - calculatedInterval * lookbackSize * 1000, // We need at least 5 buckets worth of data
    to: timerange.to,
  };
};

const aggregationsToModules = async (
  client: ESSearchClient,
  aggregations: MetricsUIAggregation,
  options: InfraSnapshotRequestOptions
): Promise<string[]> => {
  const uniqueFields = Object.values(aggregations)
    .reduce<Array<string | undefined>>((fields, agg) => {
      if (ESBasicMetricAggRT.is(agg)) {
        return uniq(fields.concat(Object.values(agg).map((a) => a?.field)));
      }
      return fields;
    }, [])
    .filter((v) => v) as string[];
  const fields = await Promise.all(
    uniqueFields.map(
      async (field) =>
        await getDatasetForField(client, field as string, options.sourceConfiguration.metricAlias)
    )
  );
  return fields.filter((f) => f) as string[];
};
