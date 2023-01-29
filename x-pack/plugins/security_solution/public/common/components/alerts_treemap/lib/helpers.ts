/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FlameElementEvent,
  HeatmapElementEvent,
  MetricElementEvent,
  PartitionElementEvent,
  WordCloudElementEvent,
  XYChartElementEvent,
} from '@elastic/charts';
import { isArray } from 'lodash/fp';

import type { RawBucket } from '../types';

export const getUpToMaxBuckets = ({
  buckets,
  maxItems,
}: {
  buckets: RawBucket[] | undefined;
  maxItems: number;
}): RawBucket[] => buckets?.slice(0, maxItems) ?? [];

export const getMaxRiskSubAggregations = (
  buckets: RawBucket[]
): Record<string, number | undefined> =>
  buckets.reduce<Record<string, number | undefined>>(
    (acc, x) => ({
      ...acc,
      [isArray(x.key) ? x.key[0] : x.key]: x.maxRiskSubAggregation?.value ?? undefined,
    }),
    {}
  );

interface GetGroupByFieldsResult {
  groupByField0: string;
  groupByField1: string;
}

export const getGroupByFieldsOnClick = (
  elements: Array<
    | FlameElementEvent
    | HeatmapElementEvent
    | MetricElementEvent
    | PartitionElementEvent
    | WordCloudElementEvent
    | XYChartElementEvent
  >
): GetGroupByFieldsResult => {
  const flattened = elements.flat(2);

  const groupByField0 =
    flattened.length > 0 && 'groupByRollup' in flattened[0] && flattened[0].groupByRollup != null
      ? `${flattened[0].groupByRollup}`
      : '';

  const groupByField1 =
    flattened.length > 1 && 'groupByRollup' in flattened[1] && flattened[1].groupByRollup != null
      ? `${flattened[1].groupByRollup}`
      : '';

  return {
    groupByField0,
    groupByField1,
  };
};

export const hasOptionalStackByField = (stackByField1: string | undefined): boolean =>
  stackByField1 != null && stackByField1.trim() !== '';
