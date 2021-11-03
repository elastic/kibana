/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, last, first } from 'lodash';
import moment from 'moment';
import { ElasticsearchClient } from 'kibana/server';
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
import { InventoryItemType, SnapshotMetricType } from '../../../../common/inventory_models/types';
import { InfraTimerangeInput, SnapshotRequest } from '../../../../common/http_api/snapshot_api';
import { InfraSource } from '../../sources';
import { UNGROUPED_FACTORY_KEY } from '../common/utils';
import { getNodes } from '../../../routes/snapshot/lib/get_nodes';
import { LogQueryFields } from '../../../services/log_queries/get_log_query_fields';

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
}: {
  condition: InventoryMetricConditions;
  nodeType: InventoryItemType;
  source: InfraSource;
  logQueryFields: LogQueryFields | undefined;
  esClient: ElasticsearchClient;
  compositeSize: number;
  filterQuery?: string;
  lookbackSize?: number;
}): Promise<Record<string, ConditionResult>> => {
  const { comparator, warningComparator, metric, customMetric } = condition;
  let { threshold, warningThreshold } = condition;

  const timerange = {
    to: Date.now(),
    from: moment().subtract(condition.timeSize, condition.timeUnit).toDate().getTime(),
    interval: condition.timeUnit,
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
    return Array.isArray(value)
      ? value.map((v) => comparisonFunction(Number(v), t))
      : [comparisonFunction(value as number, t)];
  };

  const result = mapValues(currentValues, (value) => {
    if (isTooManyBucketsPreviewException(value)) throw value;
    return {
      ...condition,
      shouldFire: valueEvaluator(value, threshold, comparator),
      shouldWarn: valueEvaluator(value, warningThreshold, warningComparator),
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

type DataValue = number | null | Array<number | string | null | undefined>;
const getData = async (
  esClient: ElasticsearchClient,
  nodeType: InventoryItemType,
  metric: SnapshotMetricType,
  timerange: InfraTimerangeInput,
  source: InfraSource,
  logQueryFields: LogQueryFields | undefined,
  compositeSize: number,
  filterQuery?: string,
  customMetric?: SnapshotCustomMetricInput
) => {
  const client = async <Hit = {}, Aggregation = undefined>(
    options: CallWithRequestParams
  ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>> =>
    // @ts-expect-error SearchResponse.body.timeout is optional
    (await esClient.search(options)).body as InfraDatabaseSearchResponse<Hit, Aggregation>;

  const metrics = [
    metric === 'custom' ? (customMetric as SnapshotCustomMetricInput) : { type: metric },
  ];

  const snapshotRequest: SnapshotRequest = {
    filterQuery,
    nodeType,
    groupBy: [],
    sourceId: 'default',
    metrics,
    timerange,
    includeTimeseries: Boolean(timerange.lookbackSize),
  };
  try {
    const { nodes } = await getNodes(
      client,
      snapshotRequest,
      source,
      compositeSize,
      logQueryFields
    );

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
