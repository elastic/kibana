/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegendItem } from '../../charts/draggable_legend_item';
import { getLegendMap, getLegendItemFromFlattenedBucket } from './legend';
import { FlattenedBucket, RawBucket } from '../types';

export const getFlattenedLegendItems = ({
  buckets,
  flattenedBuckets,
  maxRiskSubAggregations,
  stackByField0,
  stackByField1,
}: {
  buckets: RawBucket[];
  flattenedBuckets: FlattenedBucket[];
  maxRiskSubAggregations: Record<string, number | undefined>;
  stackByField0: string;
  stackByField1: string | undefined;
}): LegendItem[] => {
  // create a map of bucket.key -> LegendItem[] from the raw buckets:
  const legendMap: Record<string, LegendItem[]> = getLegendMap({
    buckets,
    maxRiskSubAggregations,
    stackByField0,
  });

  // append each flattened bucket to the appropriate parent in the legendMap:
  const combinedLegendItems: Record<string, LegendItem[]> = flattenedBuckets.reduce<
    Record<string, LegendItem[]>
  >(
    (acc, flattenedBucket) => ({
      ...acc,
      [flattenedBucket.key]: [
        ...(acc[flattenedBucket.key] ?? []),
        getLegendItemFromFlattenedBucket({
          flattenedBucket,
          maxRiskSubAggregations,
          stackByField0,
          stackByField1,
        }),
      ],
    }),
    legendMap
  );

  // reduce all the legend items to a single array in the same order as the raw buckets:
  return buckets.reduce<LegendItem[]>(
    (acc, bucket) => [...acc, ...combinedLegendItems[bucket.key]],
    []
  );
};
