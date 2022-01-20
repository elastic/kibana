/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import moment from 'moment';
import { ElasticsearchClient } from 'kibana/server';
import { Comparator, InventoryMetricConditions } from './types';
import { InventoryItemType, SnapshotMetricType } from '../../../../common/inventory_models/types';
import { InfraTimerangeInput } from '../../../../common/http_api';
import { InfraSource } from '../../sources';
import { LogQueryFields } from '../../../services/log_queries/get_log_query_fields';
import { calcualteFromBasedOnMetric } from './lib/calculate_from_based_on_metric';
import { getData } from './lib/get_data';

type ConditionResult = InventoryMetricConditions & {
  shouldFire: boolean[];
  shouldWarn: boolean[];
  currentValue: number;
  isNoData: boolean[];
  isError: boolean;
};

export const evaluateCondition = async ({
  condition,
  nodeType,
  source,
  logQueryFields,
  esClient,
  compositeSize,
  filterQuery,
  lookbackSize,
  startTime,
}: {
  condition: InventoryMetricConditions;
  nodeType: InventoryItemType;
  source: InfraSource;
  logQueryFields: LogQueryFields | undefined;
  esClient: ElasticsearchClient;
  compositeSize: number;
  filterQuery?: string;
  lookbackSize?: number;
  startTime?: number;
}): Promise<Record<string, ConditionResult>> => {
  const { comparator, warningComparator, metric, customMetric } = condition;
  let { threshold, warningThreshold } = condition;

  const to = startTime ? moment(startTime) : moment();

  const timerange = {
    to: to.valueOf(),
    from: calcualteFromBasedOnMetric(to, condition, nodeType, metric, customMetric),
    interval: `${condition.timeSize}${condition.timeUnit}`,
    forceInterval: true,
  } as InfraTimerangeInput;

  if (lookbackSize) {
    timerange.lookbackSize = lookbackSize;
  }

  const currentValues = await getData(
    esClient,
    nodeType,
    metric,
    timerange,
    source,
    logQueryFields,
    compositeSize,
    filterQuery,
    customMetric
  );

  threshold = threshold.map((n) => convertMetricValue(metric, n));
  warningThreshold = warningThreshold?.map((n) => convertMetricValue(metric, n));

  const valueEvaluator = (value?: DataValue, t?: number[], c?: Comparator) => {
    if (value === undefined || value === null || !t || !c) return [false];
    const comparisonFunction = comparatorMap[c];
    return [comparisonFunction(value as number, t)];
  };

  const result = mapValues(currentValues, (value) => {
    return {
      ...condition,
      shouldFire: valueEvaluator(value, threshold, comparator),
      shouldWarn: valueEvaluator(value, warningThreshold, warningComparator),
      isNoData: [value === null],
      isError: value === undefined,
      currentValue: getCurrentValue(value),
    };
  }) as unknown; // Typescript doesn't seem to know what `throw` is doing

  return result as Record<string, ConditionResult>;
};

const getCurrentValue: (value: number | null) => number = (value) => {
  if (value !== null) return Number(value);
  return NaN;
};

type DataValue = number | null;

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
