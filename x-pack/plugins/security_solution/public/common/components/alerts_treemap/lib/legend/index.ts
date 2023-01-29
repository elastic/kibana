/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

import { isArray } from 'lodash/fp';
import type { LegendItem } from '../../../charts/draggable_legend_item';
import { getFillColor } from '../chart_palette';
import { escapeDataProviderId } from '../../../drag_and_drop/helpers';
import { getLabel } from '../labels';
import type { FlattenedBucket, RawBucket } from '../../types';

export const getLegendItemFromRawBucket = ({
  bucket,
  colorPalette,
  maxRiskSubAggregations,
  showColor,
  stackByField0,
}: {
  bucket: RawBucket;
  colorPalette: string[];
  maxRiskSubAggregations: Record<string, number | undefined>;
  showColor: boolean;
  stackByField0: string;
}): LegendItem => ({
  color: showColor
    ? getFillColor({
        riskScore: maxRiskSubAggregations[isArray(bucket.key) ? bucket.key[0] : bucket.key] ?? 0,
        colorPalette,
      })
    : undefined,
  count: bucket.doc_count,
  dataProviderId: escapeDataProviderId(
    `draggable-legend-item-treemap-${stackByField0}-${bucket.key}-${uuidv4()}`
  ),
  render: () =>
    getLabel({
      baseLabel: bucket.key_as_string ?? (isArray(bucket.key) ? bucket.key[0] : bucket.key), // prefer key_as_string when available, because it contains a formatted date
      riskScore: bucket.maxRiskSubAggregation?.value,
    }),
  field: stackByField0,
  value: bucket.key_as_string ?? (isArray(bucket.key) ? bucket.key[0] : bucket.key),
});

export const getLegendItemFromFlattenedBucket = ({
  colorPalette,
  flattenedBucket: { key, stackByField1Key, stackByField1DocCount },
  maxRiskSubAggregations,
  stackByField0,
  stackByField1,
}: {
  colorPalette: string[];
  flattenedBucket: FlattenedBucket;
  maxRiskSubAggregations: Record<string, number | undefined>;
  stackByField0: string;
  stackByField1: string | undefined;
}): LegendItem => ({
  color: getFillColor({
    riskScore: maxRiskSubAggregations[isArray(key) ? key[0] : key] ?? 0,
    colorPalette,
  }),
  count: stackByField1DocCount,
  dataProviderId: escapeDataProviderId(
    `draggable-legend-item-treemap-${key}-${stackByField1Key}-${uuidv4()}`
  ),
  render: () => `${stackByField1Key}`,
  field: `${stackByField1}`,
  value: `${stackByField1Key}`,
});

export const getFirstGroupLegendItems = ({
  buckets,
  colorPalette,
  maxRiskSubAggregations,
  stackByField0,
}: {
  buckets: RawBucket[];
  colorPalette: string[];
  maxRiskSubAggregations: Record<string, number | undefined>;
  stackByField0: string;
}): LegendItem[] =>
  buckets.map<LegendItem>((bucket) =>
    getLegendItemFromRawBucket({
      bucket,
      colorPalette,
      maxRiskSubAggregations,
      showColor: true,
      stackByField0,
    })
  );

export const getLegendMap = ({
  buckets,
  colorPalette,
  maxRiskSubAggregations,
  stackByField0,
}: {
  buckets: RawBucket[];
  colorPalette: string[];
  maxRiskSubAggregations: Record<string, number | undefined>;
  stackByField0: string;
}): Record<string, LegendItem[]> =>
  buckets.reduce<Record<string, LegendItem[]>>(
    (acc, bucket) => ({
      ...acc,
      [isArray(bucket.key) ? bucket.key[0] : bucket.key]: [
        getLegendItemFromRawBucket({
          bucket,
          colorPalette,
          maxRiskSubAggregations,
          showColor: false, // don't show colors for stackByField0
          stackByField0,
        }),
      ],
    }),
    {}
  );
