/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { BucketAggType, type IBucketAggConfig } from '@kbn/data-plugin/common';

export const GEOHASH_GRID = 'geohash_grid';

export const getGeoHashBucketAgg = () =>
  new BucketAggType<IBucketAggConfig>({
    name: GEOHASH_GRID,
    expressionName: '',
    title: GEOHASH_GRID,
    makeLabel: () => GEOHASH_GRID,
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: KBN_FIELD_TYPES.GEO_POINT,
      },
    ],
    getRequestAggs(agg) {
      return [];
    },
  });
