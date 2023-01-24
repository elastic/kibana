/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_ORIGIN } from '../../../../../common/constants';
import { TileMetaFeature } from '../../../../../common/descriptor_types';
import { pluckOrdinalStyleMeta } from './pluck_style_meta';
import { IField } from '../../../fields/field';
import { DynamicSizeProperty } from '../../../styles/vector/properties/dynamic_size_property';

describe('pluckOrdinalStyleMeta', () => {
  test('should pluck range from metaFeatures', () => {
    const mockField = {
      isCount: () => {
        return false;
      },
      pluckRangeFromTileMetaFeature: (metaFeature: TileMetaFeature) => {
        return {
          max: metaFeature.properties['aggregations.avg_of_bytes.max'],
          min: metaFeature.properties['aggregations.avg_of_bytes.min'],
        };
      },
    } as unknown as IField;
    const mockStyleProperty = {
      getField: () => {
        return mockField;
      },
      isOrdinal: () => {
        return true;
      },
      getFieldOrigin: () => {
        return FIELD_ORIGIN.SOURCE;
      },
    } as unknown as DynamicSizeProperty;
    const metaFeatures = [
      {
        properties: {
          'aggregations.avg_of_bytes.max': 7565,
          'aggregations.avg_of_bytes.min': 1622,
        },
      } as unknown as TileMetaFeature,
      {
        properties: {
          'aggregations.avg_of_bytes.max': 11869,
          'aggregations.avg_of_bytes.min': 659,
        },
      } as unknown as TileMetaFeature,
    ];
    expect(pluckOrdinalStyleMeta(mockStyleProperty, metaFeatures, undefined)).toEqual({
      max: 11869,
      min: 659,
      delta: 11210,
    });
  });

  test('should pluck range with min: 1 from metaFeatures for count field', () => {
    const mockField = {
      isCount: () => {
        return true;
      },
      pluckRangeFromTileMetaFeature: (metaFeature: TileMetaFeature) => {
        return {
          max: metaFeature.properties['aggregations._count.max'],
          min: metaFeature.properties['aggregations._count.min'],
        };
      },
    } as unknown as IField;
    const mockStyleProperty = {
      getField: () => {
        return mockField;
      },
      isOrdinal: () => {
        return true;
      },
      getFieldOrigin: () => {
        return FIELD_ORIGIN.SOURCE;
      },
    } as unknown as DynamicSizeProperty;
    const metaFeatures = [
      {
        properties: {
          'aggregations._count.max': 35,
          'aggregations._count.min': 3,
        },
      } as unknown as TileMetaFeature,
      {
        properties: {
          'aggregations._count.max': 36,
          'aggregations._count.min': 5,
        },
      } as unknown as TileMetaFeature,
    ];
    expect(pluckOrdinalStyleMeta(mockStyleProperty, metaFeatures, undefined)).toEqual({
      max: 36,
      min: 1,
      delta: 35,
    });
  });
});
