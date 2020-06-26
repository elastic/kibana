/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mapValues, last } from 'lodash';
import moment from 'moment';
import {
  InfraDatabaseSearchResponse,
  CallWithRequestParams,
} from '../../adapters/framework/adapter_types';
import { Comparator, InventoryMetricConditions } from './types';
import { AlertServices } from '../../../../../alerts/server';
import { InfraSnapshot } from '../../snapshot';
import { parseFilterQuery } from '../../../utils/serialized_query';
import { InventoryItemType, SnapshotMetricType } from '../../../../common/inventory_models/types';
import { InfraTimerangeInput } from '../../../../common/http_api/snapshot_api';
import { InfraSourceConfiguration } from '../../sources';

interface ConditionResult {
  shouldFire: boolean | boolean[];
  currentValue?: number | null;
  metric: string;
  isNoData: boolean;
  isError: boolean;
}

export const evaluateCondition = async (
  condition: InventoryMetricConditions,
  nodeType: InventoryItemType,
  sourceConfiguration: InfraSourceConfiguration,
  callCluster: AlertServices['callCluster'],
  filterQuery?: string,
  lookbackSize?: number
): Promise<Record<string, ConditionResult>> => {
  const { comparator, metric } = condition;
  let { threshold } = condition;

  const timerange = {
    to: Date.now(),
    from: moment().subtract(condition.timeSize, condition.timeUnit).toDate().getTime(),
    interval: condition.timeUnit,
  } as InfraTimerangeInput;
  if (lookbackSize) {
    timerange.lookbackSize = lookbackSize;
  }

  const currentValues = await getData(
    callCluster,
    nodeType,
    metric,
    timerange,
    sourceConfiguration,
    filterQuery
  );

  threshold = threshold.map((n) => convertMetricValue(metric, n));

  const comparisonFunction = comparatorMap[comparator];

  return mapValues(currentValues, (value) => ({
    shouldFire:
      value !== undefined &&
      value !== null &&
      (Array.isArray(value)
        ? value.map((v) => comparisonFunction(Number(v), threshold))
        : comparisonFunction(value, threshold)),
    metric,
    isNoData: value === null,
    isError: value === undefined,
    ...(!Array.isArray(value) ? { currentValue: value } : {}),
  }));
};

const getData = async (
  callCluster: AlertServices['callCluster'],
  nodeType: InventoryItemType,
  metric: SnapshotMetricType,
  timerange: InfraTimerangeInput,
  sourceConfiguration: InfraSourceConfiguration,
  filterQuery?: string
) => {
  const snapshot = new InfraSnapshot();
  const esClient = <Hit = {}, Aggregation = undefined>(
    options: CallWithRequestParams
  ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>> => callCluster('search', options);

  const options = {
    filterQuery: parseFilterQuery(filterQuery),
    nodeType,
    groupBy: [],
    sourceConfiguration,
    metric: { type: metric },
    timerange,
    includeTimeseries: Boolean(timerange.lookbackSize),
  };

  const { nodes } = await snapshot.getNodes(esClient, options);

  return nodes.reduce((acc, n) => {
    const nodePathItem = last(n.path);
    if (n.metric?.value && n.metric?.timeseries) {
      const { timeseries } = n.metric;
      const values = timeseries.rows.map((row) => row.metric_0) as Array<number | null>;
      acc[nodePathItem.label] = values;
    } else {
      acc[nodePathItem.label] = n.metric && n.metric.value;
    }
    return acc;
  }, {} as Record<string, number | Array<number | string | null | undefined> | undefined | null>);
};

const comparatorMap = {
  [Comparator.BETWEEN]: (value: number, [a, b]: number[]) =>
    value >= Math.min(a, b) && value <= Math.max(a, b),
  // `threshold` is always an array of numbers in case the BETWEEN comparator is
  // used; all other compartors will just destructure the first value in the array
  [Comparator.GT]: (a: number, [b]: number[]) => a > b,
  [Comparator.LT]: (a: number, [b]: number[]) => a < b,
  [Comparator.OUTSIDE_RANGE]: (value: number, [a, b]: number[]) => value < a || value > b,
  [Comparator.GT_OR_EQ]: (a: number, [b]: number[]) => a >= b,
  [Comparator.LT_OR_EQ]: (a: number, [b]: number[]) => a <= b,
};

// Some metrics in the UI are in a different unit that what we store in ES.
const convertMetricValue = (metric: SnapshotMetricType, value: number) => {
  if (converters[metric]) {
    return converters[metric](value);
  } else {
    return value;
  }
};
const converters: Record<string, (n: number) => number> = {
  cpu: (n) => Number(n) / 100,
  memory: (n) => Number(n) / 100,
};
