/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mapValues, last, first } from 'lodash';
import moment from 'moment';
import { SnapshotCustomMetricInput } from '../../../../common/http_api/snapshot_api';
import {
  isTooManyBucketsPreviewException,
  TOO_MANY_BUCKETS_PREVIEW_EXCEPTION,
} from '../../../../common/alerting/metrics';
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
import { UNGROUPED_FACTORY_KEY } from '../common/utils';

type ConditionResult = InventoryMetricConditions & {
  shouldFire: boolean[];
  currentValue: number;
  isNoData: boolean[];
  isError: boolean;
};

export const evaluateCondition = async (
  condition: InventoryMetricConditions,
  nodeType: InventoryItemType,
  sourceConfiguration: InfraSourceConfiguration,
  callCluster: AlertServices['callCluster'],
  filterQuery?: string,
  lookbackSize?: number
): Promise<Record<string, ConditionResult>> => {
  const { comparator, metric, customMetric } = condition;
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
    filterQuery,
    customMetric
  );

  threshold = threshold.map((n) => convertMetricValue(metric, n));

  const comparisonFunction = comparatorMap[comparator];

  const result = mapValues(currentValues, (value) => {
    if (isTooManyBucketsPreviewException(value)) throw value;
    return {
      ...condition,
      shouldFire:
        value !== undefined &&
        value !== null &&
        (Array.isArray(value)
          ? value.map((v) => comparisonFunction(Number(v), threshold))
          : [comparisonFunction(value as number, threshold)]),
      isNoData: Array.isArray(value) ? value.map((v) => v === null) : [value === null],
      isError: value === undefined,
      currentValue: getCurrentValue(value),
    };
  }) as unknown; // Typescript doesn't seem to know what `throw` is doing

  return result as Record<string, ConditionResult>;
};

const getCurrentValue: (value: any) => number = (value) => {
  if (Array.isArray(value)) return getCurrentValue(last(value));
  if (value !== null) return Number(value);
  return NaN;
};

const getData = async (
  callCluster: AlertServices['callCluster'],
  nodeType: InventoryItemType,
  metric: SnapshotMetricType,
  timerange: InfraTimerangeInput,
  sourceConfiguration: InfraSourceConfiguration,
  filterQuery?: string,
  customMetric?: SnapshotCustomMetricInput
) => {
  const snapshot = new InfraSnapshot();
  const esClient = <Hit = {}, Aggregation = undefined>(
    options: CallWithRequestParams
  ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>> => callCluster('search', options);

  const metrics = [
    metric === 'custom' ? (customMetric as SnapshotCustomMetricInput) : { type: metric },
  ];

  const options = {
    filterQuery: parseFilterQuery(filterQuery),
    nodeType,
    groupBy: [],
    sourceConfiguration,
    metrics,
    timerange,
    includeTimeseries: Boolean(timerange.lookbackSize),
  };
  try {
    const { nodes } = await snapshot.getNodes(esClient, options);

    if (!nodes.length) return { [UNGROUPED_FACTORY_KEY]: null }; // No Data state

    return nodes.reduce((acc, n) => {
      const { name: nodeName } = n;
      const m = first(n.metrics);
      if (m && m.value && m.timeseries) {
        const { timeseries } = m;
        const values = timeseries.rows.map((row) => row.metric_0) as Array<number | null>;
        acc[nodeName] = values;
      } else {
        acc[nodeName] = m && m.value;
      }
      return acc;
    }, {} as Record<string, number | Array<number | string | null | undefined> | undefined | null>);
  } catch (e) {
    if (timerange.lookbackSize) {
      // This code should only ever be reached when previewing the alert, not executing it
      const causedByType = e.body?.error?.caused_by?.type;
      if (causedByType === 'too_many_buckets_exception') {
        return {
          [UNGROUPED_FACTORY_KEY]: {
            [TOO_MANY_BUCKETS_PREVIEW_EXCEPTION]: true,
            maxBuckets: e.body.error.caused_by.max_buckets,
          },
        };
      }
    }
    return { [UNGROUPED_FACTORY_KEY]: undefined };
  }
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
