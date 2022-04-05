/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from 'geojson';
import {
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  VECTOR_SHAPE_TYPE,
  VECTOR_STYLES,
} from '../../../../../common/constants';
import { ColorDynamicOptions } from '../../../../../common/descriptor_types';
import { IVectorLayer } from '../../vector_layer/vector_layer';
import { IVectorSource } from '../../../sources/vector_source';
import { DynamicColorProperty } from '../../../styles/vector/properties/dynamic_color_property';
import { InlineField } from '../../../fields/inline_field';
import {
  isOnlySingleFeatureType,
  pluckCategoricalStyleMetaFromFeatures,
  pluckStyleMetaFromFeatures,
} from './pluck_style_meta_from_features';

describe('pluckStyleMetaFromFeatures', () => {
  test('Should identify when feature collection only contains points', async () => {
    const features = [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
        properties: {},
      },
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPoint',
          coordinates: [
            [10.0, 40.0],
            [40.0, 30.0],
            [20.0, 20.0],
            [30.0, 10.0],
          ],
        },
        properties: {},
      },
    ] as Feature[];

    const styleMeta = await pluckStyleMetaFromFeatures(
      features,
      Object.values(VECTOR_SHAPE_TYPE),
      []
    );
    expect(styleMeta).toEqual({
      fieldMeta: {},
      geometryTypes: {
        isLinesOnly: false,
        isPointsOnly: true,
        isPolygonsOnly: false,
      },
    });
  });

  test('Should identify when feature collection only contains lines', async () => {
    const features = [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [30.0, 10.0],
            [10.0, 30.0],
            [40.0, 40.0],
          ],
        },
        properties: {},
      },
      {
        type: 'Feature',
        geometry: {
          type: 'MultiLineString',
          coordinates: [
            [
              [10.0, 10.0],
              [20.0, 20.0],
              [10.0, 40.0],
            ],
            [
              [40.0, 40.0],
              [30.0, 30.0],
              [40.0, 20.0],
              [30.0, 10.0],
            ],
          ],
        },
        properties: {},
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
        properties: {
          __kbn_is_centroid_feature__: true,
        },
      },
    ] as Feature[];

    const styleMeta = await pluckStyleMetaFromFeatures(
      features,
      Object.values(VECTOR_SHAPE_TYPE),
      []
    );
    expect(styleMeta).toEqual({
      fieldMeta: {},
      geometryTypes: {
        isLinesOnly: true,
        isPointsOnly: false,
        isPolygonsOnly: false,
      },
    });
  });

  test('Should not extract scaled field range when scaled field has no values', async () => {
    const features = [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
        properties: {
          myDynamicField: 1,
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
        properties: {
          myDynamicField: 10,
        },
      },
    ] as Feature[];
    const dynamicColorOptions = {
      type: COLOR_MAP_TYPE.ORDINAL,
      field: {
        origin: FIELD_ORIGIN.SOURCE,
        name: 'myDynamicFieldWithNoValues',
      },
    } as ColorDynamicOptions;
    const field = new InlineField({
      fieldName: dynamicColorOptions.field!.name,
      source: {} as unknown as IVectorSource,
      origin: dynamicColorOptions.field!.origin,
      dataType: 'number',
    });
    const dynamicColorProperty = new DynamicColorProperty(
      dynamicColorOptions,
      VECTOR_STYLES.FILL_COLOR,
      field,
      {} as unknown as IVectorLayer,
      () => {
        return null;
      } // getFieldFormatter
    );

    const styleMeta = await pluckStyleMetaFromFeatures(features, Object.values(VECTOR_SHAPE_TYPE), [
      dynamicColorProperty,
    ]);
    expect(styleMeta).toEqual({
      fieldMeta: {
        myDynamicFieldWithNoValues: {
          categories: [],
        },
      },
      geometryTypes: {
        isLinesOnly: false,
        isPointsOnly: true,
        isPolygonsOnly: false,
      },
    });
  });

  test('Should extract scaled field range', async () => {
    const features = [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
        properties: {
          myDynamicField: 1,
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
        properties: {
          myDynamicField: 10,
        },
      },
    ] as Feature[];
    const dynamicColorOptions = {
      type: COLOR_MAP_TYPE.ORDINAL,
      field: {
        origin: FIELD_ORIGIN.SOURCE,
        name: 'myDynamicField',
      },
    } as ColorDynamicOptions;
    const field = new InlineField({
      fieldName: dynamicColorOptions.field!.name,
      source: {} as unknown as IVectorSource,
      origin: dynamicColorOptions.field!.origin,
      dataType: 'number',
    });
    const dynamicColorProperty = new DynamicColorProperty(
      dynamicColorOptions,
      VECTOR_STYLES.FILL_COLOR,
      field,
      {} as unknown as IVectorLayer,
      () => {
        return null;
      } // getFieldFormatter
    );

    const styleMeta = await pluckStyleMetaFromFeatures(features, Object.values(VECTOR_SHAPE_TYPE), [
      dynamicColorProperty,
    ]);
    expect(styleMeta).toEqual({
      fieldMeta: {
        myDynamicField: {
          categories: [],
          range: {
            delta: 9,
            max: 10,
            min: 1,
          },
        },
      },
      geometryTypes: {
        isLinesOnly: false,
        isPointsOnly: true,
        isPolygonsOnly: false,
      },
    });
  });
});

describe('pluckCategoricalStyleMetaFromFeatures', () => {
  test('Should pluck the categorical style-meta', async () => {
    const field = new InlineField({
      fieldName: 'foobar',
      source: {} as unknown as IVectorSource,
      origin: FIELD_ORIGIN.SOURCE,
      dataType: 'number',
    });
    const dynamicColorProperty = new DynamicColorProperty(
      {
        type: COLOR_MAP_TYPE.CATEGORICAL,
        colorCategory: 'palette_0',
        fieldMetaOptions: { isEnabled: true },
      },
      VECTOR_STYLES.LINE_COLOR,
      field,
      {} as unknown as IVectorLayer,
      () => {
        return null;
      } // getFieldFormatter
    );

    const features = [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-10, 0],
        },
        properties: {
          foobar: 'CN',
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-10, 0],
        },
        properties: {
          foobar: 'CN',
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-10, 0],
        },
        properties: {
          foobar: 'US',
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-10, 0],
        },
        properties: {
          foobar: 'CN',
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-10, 0],
        },
        properties: {
          foobar: 'US',
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-10, 0],
        },
        properties: {
          foobar: 'IN',
        },
      },
    ] as Feature[];

    const categories = pluckCategoricalStyleMetaFromFeatures(dynamicColorProperty, features);

    expect(categories).toEqual([
      { key: 'CN', count: 3 },
      { key: 'US', count: 2 },
      { key: 'IN', count: 1 },
    ]);
  });
});

describe('isOnlySingleFeatureType', () => {
  describe('source supports single feature type', () => {
    const supportedFeatures = [VECTOR_SHAPE_TYPE.POINT];
    const hasFeatureType = {
      [VECTOR_SHAPE_TYPE.POINT]: false,
      [VECTOR_SHAPE_TYPE.LINE]: false,
      [VECTOR_SHAPE_TYPE.POLYGON]: false,
    };

    test('Is only single feature type when only supported feature type is target feature type', () => {
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPE.POINT, supportedFeatures, hasFeatureType)
      ).toBe(true);
    });

    test('Is not single feature type when only supported feature type is not target feature type', () => {
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPE.LINE, supportedFeatures, hasFeatureType)
      ).toBe(false);
    });
  });

  describe('source supports multiple feature types', () => {
    const supportedFeatures = [
      VECTOR_SHAPE_TYPE.POINT,
      VECTOR_SHAPE_TYPE.LINE,
      VECTOR_SHAPE_TYPE.POLYGON,
    ];

    test('Is only single feature type when data only has target feature type', () => {
      const hasFeatureType = {
        [VECTOR_SHAPE_TYPE.POINT]: true,
        [VECTOR_SHAPE_TYPE.LINE]: false,
        [VECTOR_SHAPE_TYPE.POLYGON]: false,
      };
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPE.POINT, supportedFeatures, hasFeatureType)
      ).toBe(true);
    });

    test('Is not single feature type when data has multiple feature types', () => {
      const hasFeatureType = {
        [VECTOR_SHAPE_TYPE.POINT]: true,
        [VECTOR_SHAPE_TYPE.LINE]: true,
        [VECTOR_SHAPE_TYPE.POLYGON]: true,
      };
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPE.LINE, supportedFeatures, hasFeatureType)
      ).toBe(false);
    });

    test('Is not single feature type when data does not have target feature types', () => {
      const hasFeatureType = {
        [VECTOR_SHAPE_TYPE.POINT]: false,
        [VECTOR_SHAPE_TYPE.LINE]: true,
        [VECTOR_SHAPE_TYPE.POLYGON]: false,
      };
      expect(
        isOnlySingleFeatureType(VECTOR_SHAPE_TYPE.POINT, supportedFeatures, hasFeatureType)
      ).toBe(false);
    });
  });
});
