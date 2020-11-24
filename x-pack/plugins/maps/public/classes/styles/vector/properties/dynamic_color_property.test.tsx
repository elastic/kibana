/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../components/vector_style_editor', () => ({
  VectorStyleEditor: () => {
    return <div>mockVectorStyleEditor</div>;
  },
}));

import React from 'react';
import { shallow } from 'enzyme';
import { Feature, Point } from 'geojson';

import { DynamicColorProperty } from './dynamic_color_property';
import {
  COLOR_MAP_TYPE,
  RawValue,
  STEP_FUNCTION,
  VECTOR_STYLES,
} from '../../../../../common/constants';
import { mockField, MockLayer, MockStyle } from './__tests__/test_util';
import { ColorDynamicOptions } from '../../../../../common/descriptor_types';
import { IVectorLayer } from '../../../layers/vector_layer/vector_layer';
import { IField } from '../../../fields/field';

const makeProperty = (options: ColorDynamicOptions, style?: MockStyle, field?: IField) => {
  return new DynamicColorProperty(
    options,
    VECTOR_STYLES.LINE_COLOR,
    field ? field : mockField,
    (new MockLayer(style ? style : new MockStyle()) as unknown) as IVectorLayer,
    () => {
      return (value: RawValue) => value + '_format';
    }
  );
};

const defaultLegendParams = {
  isPointsOnly: true,
  isLinesOnly: false,
};

const fieldMetaOptions = { isEnabled: true };

describe('renderLegendDetailRow', () => {
  describe('ordinal', () => {
    test('Should render easing bands', async () => {
      const colorStyle = makeProperty({
        color: 'Blues',
        type: undefined,
        fieldMetaOptions,
      });

      const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

      const component = shallow(legendRow);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });

    test('Should render single band when easing range is 0', async () => {
      const colorStyle = makeProperty({
        color: 'Blues',
        type: undefined,
        fieldMetaOptions,
      });
      colorStyle.getRangeFieldMeta = () => {
        return {
          min: 100,
          max: 100,
          delta: 0,
        };
      };

      const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

      const component = shallow(legendRow);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });

    test('Should render percentile bands', async () => {
      const colorStyle = makeProperty({
        color: 'Blues',
        type: undefined,
        stepFunction: STEP_FUNCTION.PERCENTILES,
        fieldMetaOptions: {
          isEnabled: true,
          percentiles: [50, 75, 90, 95, 99],
        },
      });
      colorStyle.getPercentilesFieldMeta = () => {
        return [
          { percentile: '0.0', value: 0 },
          { percentile: '50.0', value: 5571.815277777777 },
          { percentile: '75.0', value: 8078.703125 },
          { percentile: '90.0', value: 9607.2 },
          { percentile: '95.0', value: 10439.083333333334 },
          { percentile: '99.0', value: 16856.5 },
        ];
      };

      const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

      const component = shallow(legendRow);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });

    test('Should render custom ordinal legend with breaks', async () => {
      const colorStyle = makeProperty({
        type: COLOR_MAP_TYPE.ORDINAL,
        useCustomColorRamp: true,
        customColorRamp: [
          {
            stop: 0,
            color: '#FF0000',
          },
          {
            stop: 10,
            color: '#00FF00',
          },
        ],
        fieldMetaOptions,
      });

      const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

      const component = shallow(legendRow);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });
  });

  describe('categorical', () => {
    test('Should render categorical legend with breaks from default', async () => {
      const colorStyle = makeProperty({
        type: COLOR_MAP_TYPE.CATEGORICAL,
        useCustomColorPalette: false,
        colorCategory: 'palette_0',
        fieldMetaOptions,
      });

      const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

      const component = shallow(legendRow);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });

    test('Should render categorical legend with breaks from custom', async () => {
      const colorStyle = makeProperty({
        type: COLOR_MAP_TYPE.CATEGORICAL,
        useCustomColorPalette: true,
        customColorPalette: [
          {
            stop: null, // should include the default stop
            color: '#FFFF00',
          },
          {
            stop: 'US_STOP',
            color: '#FF0000',
          },
          {
            stop: 'CN_STOP',
            color: '#00FF00',
          },
        ],
        fieldMetaOptions,
      });

      const legendRow = colorStyle.renderLegendDetailRow(defaultLegendParams);

      const component = shallow(legendRow);

      expect(component).toMatchSnapshot();
    });
  });
});

function makeFeatures(foobarPropValues: string[]) {
  return foobarPropValues.map((value: string) => {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-10, 0],
      } as Point,
      properties: {
        foobar: value,
      },
    } as Feature;
  });
}

test('Should pluck the categorical style-meta', async () => {
  const colorStyle = makeProperty({
    type: COLOR_MAP_TYPE.CATEGORICAL,
    colorCategory: 'palette_0',
    fieldMetaOptions,
  });

  const features = makeFeatures(['CN', 'CN', 'US', 'CN', 'US', 'IN']);
  const meta = colorStyle.pluckCategoricalStyleMetaFromFeatures(features);

  expect(meta).toEqual({
    categories: [
      { key: 'CN', count: 3 },
      { key: 'US', count: 2 },
      { key: 'IN', count: 1 },
    ],
  });
});

test('Should pluck the categorical style-meta from fieldmeta', async () => {
  const colorStyle = makeProperty({
    type: COLOR_MAP_TYPE.CATEGORICAL,
    colorCategory: 'palette_0',
    fieldMetaOptions,
  });

  const meta = colorStyle._pluckCategoricalStyleMetaFromFieldMetaData({
    foobar: {
      buckets: [
        {
          key: 'CN',
          doc_count: 3,
        },
        { key: 'US', doc_count: 2 },
        { key: 'IN', doc_count: 1 },
      ],
    },
  });

  expect(meta).toEqual({
    categories: [
      { key: 'CN', count: 3 },
      { key: 'US', count: 2 },
      { key: 'IN', count: 1 },
    ],
  });
});

describe('supportsFieldMeta', () => {
  test('should support fieldMeta when ordinal field supports fieldMeta', () => {
    const dynamicStyleOptions = {
      type: COLOR_MAP_TYPE.ORDINAL,
      fieldMetaOptions,
    };
    const styleProp = makeProperty(dynamicStyleOptions);

    expect(styleProp.supportsFieldMeta()).toEqual(true);
  });

  test('should support fieldMeta when categorical field supports fieldMeta', () => {
    const dynamicStyleOptions = {
      type: COLOR_MAP_TYPE.CATEGORICAL,
      fieldMetaOptions,
    };
    const styleProp = makeProperty(dynamicStyleOptions);

    expect(styleProp.supportsFieldMeta()).toEqual(true);
  });

  test('should not support fieldMeta when field does not support fieldMeta', () => {
    const field = Object.create(mockField);
    field.supportsFieldMeta = function () {
      return false;
    };

    const dynamicStyleOptions = {
      type: COLOR_MAP_TYPE.ORDINAL,
      fieldMetaOptions,
    };
    const styleProp = makeProperty(dynamicStyleOptions, undefined, field);

    expect(styleProp.supportsFieldMeta()).toEqual(false);
  });

  test('should not support fieldMeta when field is not provided', () => {
    const dynamicStyleOptions = {
      type: COLOR_MAP_TYPE.ORDINAL,
      fieldMetaOptions,
    };

    const styleProp = new DynamicColorProperty(
      dynamicStyleOptions,
      VECTOR_STYLES.LINE_COLOR,
      null,
      (new MockLayer(new MockStyle()) as unknown) as IVectorLayer,
      () => {
        return (value: RawValue) => value + '_format';
      }
    );

    expect(styleProp.supportsFieldMeta()).toEqual(false);
  });

  test('should not support fieldMeta when using custom ramp for ordinal field', () => {
    const dynamicStyleOptions = {
      type: COLOR_MAP_TYPE.ORDINAL,
      useCustomColorRamp: true,
      customColorRamp: [],
      fieldMetaOptions,
    };
    const styleProp = makeProperty(dynamicStyleOptions);

    expect(styleProp.supportsFieldMeta()).toEqual(false);
  });

  test('should not support fieldMeta when using custom palette for categorical field', () => {
    const dynamicStyleOptions = {
      type: COLOR_MAP_TYPE.CATEGORICAL,
      useCustomColorPalette: true,
      customColorPalette: [],
      fieldMetaOptions,
    };
    const styleProp = makeProperty(dynamicStyleOptions);

    expect(styleProp.supportsFieldMeta()).toEqual(false);
  });
});

describe('get mapbox color expression (via internal _getMbColor)', () => {
  describe('ordinal color ramp', () => {
    test('should return null when field is not provided', async () => {
      const dynamicStyleOptions = {
        type: COLOR_MAP_TYPE.ORDINAL,
        fieldMetaOptions,
      };
      const colorProperty = makeProperty(dynamicStyleOptions);
      expect(colorProperty._getMbColor()).toBeNull();
    });

    test('should return null when field name is not provided', async () => {
      const dynamicStyleOptions = {
        type: COLOR_MAP_TYPE.ORDINAL,
        field: {},
        fieldMetaOptions,
      };
      // @ts-expect-error - test is verifing behavior when field is invalid.
      const colorProperty = makeProperty(dynamicStyleOptions);
      expect(colorProperty._getMbColor()).toBeNull();
    });

    describe('pre-defined color ramp', () => {
      test('should return null when color ramp is not provided', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          fieldMetaOptions,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });
      test('should return mapbox expression for color ramp', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          color: 'Blues',
          fieldMetaOptions,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toEqual([
          'interpolate',
          ['linear'],
          [
            'coalesce',
            [
              'case',
              ['==', ['feature-state', 'foobar'], null],
              -1,
              ['max', ['min', ['to-number', ['feature-state', 'foobar']], 100], 0],
            ],
            -1,
          ],
          -1,
          'rgba(0,0,0,0)',
          0,
          '#ecf1f7',
          12.5,
          '#d9e3ef',
          25,
          '#c5d5e7',
          37.5,
          '#b2c7df',
          50,
          '#9eb9d8',
          62.5,
          '#8bacd0',
          75,
          '#769fc8',
          87.5,
          '#6092c0',
        ]);
      });
    });

    describe('custom color ramp', () => {
      test('should return null when customColorRamp is not provided', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          useCustomColorRamp: true,
          fieldMetaOptions,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return null when customColorRamp is empty', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          useCustomColorRamp: true,
          customColorRamp: [],
          fieldMetaOptions,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should use `feature-state` by default', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          useCustomColorRamp: true,
          customColorRamp: [
            { stop: 10, color: '#f7faff' },
            { stop: 100, color: '#072f6b' },
          ],
          fieldMetaOptions,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toEqual([
          'step',
          ['coalesce', ['feature-state', 'foobar'], 9],
          'rgba(0,0,0,0)',
          10,
          '#f7faff',
          100,
          '#072f6b',
        ]);
      });

      test('should use `get` when source cannot return raw geojson', async () => {
        const field = Object.create(mockField);
        field.canReadFromGeoJson = function () {
          return false;
        };
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          useCustomColorRamp: true,
          customColorRamp: [
            { stop: 10, color: '#f7faff' },
            { stop: 100, color: '#072f6b' },
          ],
          fieldMetaOptions,
        };
        const colorProperty = makeProperty(dynamicStyleOptions, undefined, field);
        expect(colorProperty._getMbColor()).toEqual([
          'step',
          ['coalesce', ['get', 'foobar'], 9],
          'rgba(0,0,0,0)',
          10,
          '#f7faff',
          100,
          '#072f6b',
        ]);
      });
    });
  });

  describe('categorical color palette', () => {
    test('should return null when field is not provided', async () => {
      const dynamicStyleOptions = {
        type: COLOR_MAP_TYPE.CATEGORICAL,
        fieldMetaOptions,
      };
      const colorProperty = makeProperty(dynamicStyleOptions);
      expect(colorProperty._getMbColor()).toBeNull();
    });

    test('should return null when field name is not provided', async () => {
      const dynamicStyleOptions = {
        type: COLOR_MAP_TYPE.CATEGORICAL,
        field: {},
        fieldMetaOptions,
      };
      // @ts-expect-error - test is verifing behavior when field is invalid.
      const colorProperty = makeProperty(dynamicStyleOptions);
      expect(colorProperty._getMbColor()).toBeNull();
    });

    describe('pre-defined color palette', () => {
      test('should return null when color palette is not provided', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          fieldMetaOptions,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return mapbox expression for color palette', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          colorCategory: 'palette_0',
          fieldMetaOptions,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toEqual([
          'match',
          ['to-string', ['get', 'foobar']],
          'US',
          '#54B399',
          'CN',
          '#6092C0',
          '#D36086',
        ]);
      });
    });

    describe('custom color palette', () => {
      test('should return null when customColorPalette is not provided', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          useCustomColorPalette: true,
          fieldMetaOptions,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return null when customColorPalette is empty', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          useCustomColorPalette: true,
          customColorPalette: [],
          fieldMetaOptions,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });

      test('should return mapbox expression for custom color palette', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.CATEGORICAL,
          useCustomColorPalette: true,
          customColorPalette: [
            { stop: null, color: '#f7faff' },
            { stop: 'MX', color: '#072f6b' },
          ],
          fieldMetaOptions,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toEqual([
          'match',
          ['to-string', ['get', 'foobar']],
          'MX',
          '#072f6b',
          '#f7faff',
        ]);
      });
    });
  });
});

test('isCategorical should return true when type is categorical', async () => {
  const categoricalColorStyle = makeProperty({
    type: COLOR_MAP_TYPE.CATEGORICAL,
    colorCategory: 'palette_0',
    fieldMetaOptions,
  });

  expect(categoricalColorStyle.isOrdinal()).toEqual(false);
  expect(categoricalColorStyle.isCategorical()).toEqual(true);
});

test('isOrdinal should return true when type is ordinal', async () => {
  const ordinalColorStyle = makeProperty({
    type: undefined,
    color: 'Blues',
    fieldMetaOptions,
  });

  expect(ordinalColorStyle.isOrdinal()).toEqual(true);
  expect(ordinalColorStyle.isCategorical()).toEqual(false);
});

test('Should read out ordinal type correctly', async () => {
  const ordinalColorStyle2 = makeProperty({
    type: COLOR_MAP_TYPE.ORDINAL,
    colorCategory: 'palette_0',
    fieldMetaOptions,
  });

  expect(ordinalColorStyle2.isOrdinal()).toEqual(true);
  expect(ordinalColorStyle2.isCategorical()).toEqual(false);
});

describe('renderDataMappingPopover', () => {
  test('Should enable toggle when field is backed by geojson-source', () => {
    const colorStyle = makeProperty(
      {
        color: 'Blues',
        type: undefined,
        fieldMetaOptions,
      },
      undefined,
      mockField
    );

    const legendRow = colorStyle.renderDataMappingPopover(() => {});
    expect(legendRow).toMatchSnapshot();
  });

  test('Should disable toggle when field is not backed by geojson source', () => {
    const nonGeoJsonField = Object.create(mockField);
    nonGeoJsonField.canReadFromGeoJson = () => {
      return false;
    };
    const colorStyle = makeProperty(
      {
        color: 'Blues',
        type: undefined,
        fieldMetaOptions,
      },
      undefined,
      nonGeoJsonField
    );

    const legendRow = colorStyle.renderDataMappingPopover(() => {});
    expect(legendRow).toMatchSnapshot();
  });
});
