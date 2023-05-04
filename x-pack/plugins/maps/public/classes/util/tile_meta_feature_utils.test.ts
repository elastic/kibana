/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TileMetaFeature } from '../../../common/descriptor_types';
import { getAggsMeta, getAggRange, getHitsMeta } from './tile_meta_feature_utils';

describe('getAggsMeta', () => {
  test('should extract doc_count = 0 from meta features when there are no matches', () => {
    const metaFeatures = [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-101.25, 31.952162238024968],
              [-95.625, 31.952162238024968],
              [-95.625, 36.597889133070225],
              [-101.25, 36.597889133070225],
              [-101.25, 31.952162238024968],
            ],
          ],
        },
        properties: {
          '_shards.failed': 0,
          '_shards.skipped': 0,
          '_shards.successful': 1,
          '_shards.total': 1,
          'aggregations._count.count': 0,
          'aggregations._count.sum': 0,
          'hits.total.relation': 'eq',
          'hits.total.value': 0,
          timed_out: false,
          took: 1,
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-106.875, 31.952162238024968],
              [-101.25, 31.952162238024968],
              [-101.25, 36.597889133070225],
              [-106.875, 36.597889133070225],
              [-106.875, 31.952162238024968],
            ],
          ],
        },
        properties: {
          '_shards.failed': 0,
          '_shards.skipped': 0,
          '_shards.successful': 1,
          '_shards.total': 1,
          'aggregations._count.count': 0,
          'aggregations._count.sum': 0,
          'hits.total.relation': 'eq',
          'hits.total.value': 0,
          timed_out: false,
          took: 1,
        },
      },
    ] as TileMetaFeature[];
    const { docCount } = getAggsMeta(metaFeatures);
    expect(docCount).toBe(0);
  });

  test('should extract doc_count from meta features', () => {
    const metaFeatures = [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-106.875, 36.597889133070225],
              [-101.25, 36.597889133070225],
              [-101.25, 40.979898069620134],
              [-106.875, 40.979898069620134],
              [-106.875, 36.597889133070225],
            ],
          ],
        },
        properties: {
          '_shards.failed': 0,
          '_shards.skipped': 0,
          '_shards.successful': 1,
          '_shards.total': 1,
          'aggregations._count.avg': 92.3133514986376,
          'aggregations._count.count': 9175,
          'aggregations._count.max': 8297,
          'aggregations._count.min': 1,
          'aggregations._count.sum': 846975,
          'hits.total.relation': 'gte',
          'hits.total.value': 10000,
          timed_out: false,
          took: 968,
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-112.5, 36.597889133070225],
              [-106.875, 36.597889133070225],
              [-106.875, 40.979898069620134],
              [-112.5, 40.979898069620134],
              [-112.5, 36.597889133070225],
            ],
          ],
        },
        properties: {
          '_shards.failed': 0,
          '_shards.skipped': 0,
          '_shards.successful': 1,
          '_shards.total': 1,
          'aggregations._count.avg': 41.19310344827586,
          'aggregations._count.count': 4495,
          'aggregations._count.max': 2398,
          'aggregations._count.min': 1,
          'aggregations._count.sum': 185163,
          'hits.total.relation': 'gte',
          'hits.total.value': 10000,
          timed_out: false,
          took: 522,
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-106.875, 40.979898069620134],
              [-101.25, 40.979898069620134],
              [-101.25, 45.08903556483102],
              [-106.875, 45.08903556483102],
              [-106.875, 40.979898069620134],
            ],
          ],
        },
        properties: {
          '_shards.failed': 0,
          '_shards.skipped': 0,
          '_shards.successful': 1,
          '_shards.total': 1,
          'aggregations._count.avg': 9.938271604938272,
          'aggregations._count.count': 81,
          'aggregations._count.max': 96,
          'aggregations._count.min': 1,
          'aggregations._count.sum': 805,
          'hits.total.relation': 'eq',
          'hits.total.value': 792,
          timed_out: false,
          took: 12,
        },
      },
    ] as TileMetaFeature[];
    const { docCount } = getAggsMeta(metaFeatures);
    expect(docCount).toBe(1032943);
  });
});

test('getAggRange', () => {
  const metaFeature = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-106.875, 40.979898069620134],
          [-101.25, 40.979898069620134],
          [-101.25, 45.08903556483102],
          [-106.875, 45.08903556483102],
          [-106.875, 40.979898069620134],
        ],
      ],
    },
    properties: {
      '_shards.failed': 0,
      '_shards.skipped': 0,
      '_shards.successful': 1,
      '_shards.total': 1,
      'aggregations._count.avg': 9.938271604938272,
      'aggregations._count.count': 81,
      'aggregations._count.max': 96,
      'aggregations._count.min': 1,
      'aggregations._count.sum': 805,
      'hits.total.relation': 'eq',
      'hits.total.value': 792,
      timed_out: false,
      took: 12,
    },
  } as TileMetaFeature;
  expect(getAggRange(metaFeature, '_count')).toEqual({
    max: 96,
    min: 1,
  });
});

describe('getHitsMeta', () => {
  test('should extract 0 total hits from meta features when there are no matches', () => {
    const metaFeatures = [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-101.25, 31.952162238024968],
              [-95.625, 31.952162238024968],
              [-95.625, 36.597889133070225],
              [-101.25, 36.597889133070225],
              [-101.25, 31.952162238024968],
            ],
          ],
        },
        properties: {
          '_shards.failed': 0,
          '_shards.skipped': 0,
          '_shards.successful': 1,
          '_shards.total': 1,
          'hits.total.relation': 'eq',
          'hits.total.value': 0,
          timed_out: false,
          took: 7,
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-106.875, 31.952162238024968],
              [-101.25, 31.952162238024968],
              [-101.25, 36.597889133070225],
              [-106.875, 36.597889133070225],
              [-106.875, 31.952162238024968],
            ],
          ],
        },
        properties: {
          '_shards.failed': 0,
          '_shards.skipped': 0,
          '_shards.successful': 1,
          '_shards.total': 1,
          'hits.total.relation': 'eq',
          'hits.total.value': 0,
          timed_out: false,
          took: 7,
        },
      },
    ] as TileMetaFeature[];
    expect(getHitsMeta(metaFeatures, 10000)).toEqual({
      tilesWithFeatures: 0,
      tilesWithTrimmedResults: 0,
      totalFeaturesCount: 0,
    });
  });

  test('should extract hits meta from  meta features', () => {
    const metaFeatures = [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-106.875, 36.99268153210721],
              [-102.03826904296875, 36.99268153210721],
              [-102.03826904296875, 40.979898069620134],
              [-106.875, 40.979898069620134],
              [-106.875, 36.99268153210721],
            ],
          ],
        },
        properties: {
          '_shards.failed': 0,
          '_shards.skipped': 0,
          '_shards.successful': 1,
          '_shards.total': 1,
          'hits.total.relation': 'gte',
          'hits.total.value': 10001,
          timed_out: false,
          took: 1571,
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-109.05853271484375, 36.99706886366255],
              [-106.875, 36.99706886366255],
              [-106.875, 40.95086262813277],
              [-109.05853271484375, 40.95086262813277],
              [-109.05853271484375, 36.99706886366255],
            ],
          ],
        },
        properties: {
          '_shards.failed': 0,
          '_shards.skipped': 0,
          '_shards.successful': 1,
          '_shards.total': 1,
          'hits.total.relation': 'gte',
          'hits.total.value': 10001,
          timed_out: false,
          took: 1039,
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-101.25, 40.979898069620134],
              [-95.625, 40.979898069620134],
              [-95.625, 45.08903556483102],
              [-101.25, 45.08903556483102],
              [-101.25, 40.979898069620134],
            ],
          ],
        },
        properties: {
          '_shards.failed': 0,
          '_shards.skipped': 0,
          '_shards.successful': 1,
          '_shards.total': 1,
          'hits.total.relation': 'eq',
          'hits.total.value': 0,
          timed_out: false,
          took: 7,
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-107.7923583984375, 40.991301354803056],
              [-107.05078125, 40.991301354803056],
              [-107.05078125, 41.0037390532903],
              [-107.7923583984375, 41.0037390532903],
              [-107.7923583984375, 40.991301354803056],
            ],
          ],
        },
        properties: {
          '_shards.failed': 0,
          '_shards.skipped': 0,
          '_shards.successful': 1,
          '_shards.total': 1,
          'hits.total.relation': 'eq',
          'hits.total.value': 28,
          timed_out: false,
          took: 10,
        },
      },
    ] as TileMetaFeature[];
    expect(getHitsMeta(metaFeatures, 10000)).toEqual({
      tilesWithFeatures: 3,
      tilesWithTrimmedResults: 2,
      totalFeaturesCount: 20030,
    });
  });
});
