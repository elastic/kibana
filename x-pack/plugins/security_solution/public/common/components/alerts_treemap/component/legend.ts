/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';

import { LegendItem } from '../../charts/draggable_legend_item';
import { getFillColor } from '../../../../detections/pages/detection_engine/get_fill_color';
import { escapeDataProviderId } from '../../drag_and_drop/helpers';
import { getLabel } from './labels';
import type { FlattenedBucket, RawBucket } from '../types';

export const getLegendItemFromRawBucket = ({
  bucket,
  maxRiskSubAggregations,
  showColor = true,
  stackByField0,
}: {
  bucket: RawBucket;
  maxRiskSubAggregations: Record<string, number | undefined>;
  showColor?: boolean;
  stackByField0: string;
}): LegendItem => ({
  color: showColor
    ? getFillColor({
        riskScore: maxRiskSubAggregations[bucket.key] ?? 0,
        useWarmPalette: false,
      })
    : undefined,
  count: bucket.doc_count,
  dataProviderId: escapeDataProviderId(
    `draggable-legend-item-treemap-${stackByField0}-${bucket.key}-${uuid.v4()}`
  ),
  render: () =>
    getLabel({
      baseLabel: bucket.key,
      riskScore: bucket.maxRiskSubAggregation?.value,
    }),
  field: stackByField0,
  value: bucket.key,
});

export const getLegendItemFromFlattenedBucket = ({
  flattenedBucket: { key, stackByField1Key, stackByField1DocCount },
  maxRiskSubAggregations,
  stackByField0,
  stackByField1,
}: {
  flattenedBucket: FlattenedBucket;
  maxRiskSubAggregations: Record<string, number | undefined>;
  stackByField0: string;
  stackByField1: string | undefined;
}): LegendItem => ({
  color: getFillColor({
    riskScore: maxRiskSubAggregations[key] ?? 0,
    useWarmPalette: false,
  }),
  count: stackByField1DocCount,
  dataProviderId: escapeDataProviderId(
    `draggable-legend-item-treemap-${key}-${stackByField1Key}-${uuid.v4()}`
  ),
  render: () => `${stackByField1Key}`,
  field: `${stackByField1}`,
  value: `${stackByField1Key}`,
});

export const getFirstGroupLegendItems = ({
  buckets,
  maxRiskSubAggregations,
  stackByField0,
}: {
  buckets: RawBucket[];
  maxRiskSubAggregations: Record<string, number | undefined>;
  stackByField0: string;
}): LegendItem[] =>
  buckets.map<LegendItem>((bucket) =>
    getLegendItemFromRawBucket({
      bucket,
      maxRiskSubAggregations,
      stackByField0,
    })
  );

export const getLegendMap = ({
  buckets,
  maxRiskSubAggregations,
  stackByField0,
}: {
  buckets: RawBucket[];
  maxRiskSubAggregations: Record<string, number | undefined>;
  stackByField0: string;
}): Record<string, LegendItem[]> =>
  buckets.reduce<Record<string, LegendItem[]>>(
    (acc, bucket) => ({
      ...acc,
      [bucket.key]: [
        getLegendItemFromRawBucket({
          bucket,
          maxRiskSubAggregations,
          showColor: false,
          stackByField0,
        }),
      ],
    }),
    {}
  );
