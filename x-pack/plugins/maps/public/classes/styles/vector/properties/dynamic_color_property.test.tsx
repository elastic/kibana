/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  FIELD_ORIGIN,
  RawValue,
  DATA_MAPPING_FUNCTION,
  VECTOR_STYLES,
} from '../../../../../common/constants';
import { mockField, MockLayer, MockStyle } from './test_helpers/test_util';
import { ColorDynamicOptions } from '../../../../../common/descriptor_types';
import { IVectorLayer } from '../../../layers/vector_layer';
import { IField } from '../../../fields/field';

const makeProperty = (options: ColorDynamicOptions, style?: MockStyle, field?: IField) => {
  return new DynamicColorProperty(
    options,
    VECTOR_STYLES.LINE_COLOR,
    field ? field : mockField,
    new MockLayer(style ? style : new MockStyle()) as unknown as IVectorLayer,
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
    test('Should render interpolate bands', async () => {
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

    test('Should render single band when interpolate range is 0', async () => {
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
        dataMappingFunction: DATA_MAPPING_FUNCTION.PERCENTILES,
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

  expect(meta).toEqual([
    { key: 'CN', count: 3 },
    { key: 'US', count: 2 },
    { key: 'IN', count: 1 },
  ]);
});

test('Should pluck the categorical style-meta from fieldmeta', async () => {
  const colorStyle = makeProperty({
    type: COLOR_MAP_TYPE.CATEGORICAL,
    colorCategory: 'palette_0',
    fieldMetaOptions,
  });

  const meta = colorStyle._pluckCategoricalStyleMetaFromFieldMetaData({
    foobar_terms: {
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

  expect(meta).toEqual([
    { key: 'CN', count: 3 },
    { key: 'US', count: 2 },
    { key: 'IN', count: 1 },
  ]);
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

  test('should not support fieldMeta when field does not support fieldMeta from ES', () => {
    const field = {
      supportsFieldMetaFromEs() {
        return false;
      },
    } as unknown as IField;
    const layer = {} as unknown as IVectorLayer;
    const options = {
      type: COLOR_MAP_TYPE.ORDINAL,
      fieldMetaOptions: { isEnabled: true },
    };

    const styleProp = new DynamicColorProperty(
      options,
      VECTOR_STYLES.LINE_COLOR,
      field,
      layer,
      () => {
        return (value: RawValue) => value + '_format';
      }
    );

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
      new MockLayer(new MockStyle()) as unknown as IVectorLayer,
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

    describe('interpolate color ramp', () => {
      test('should return null when color ramp is not provided', async () => {
        const dynamicStyleOptions = {
          type: COLOR_MAP_TYPE.ORDINAL,
          fieldMetaOptions,
        };
        const colorProperty = makeProperty(dynamicStyleOptions);
        expect(colorProperty._getMbColor()).toBeNull();
      });
      test('should return mapbox expression for color ramp', async () => {
        const field = {
          getMbFieldName: () => {
            return 'foobar';
          },
          getName: () => {
            return 'foobar';
          },
          getOrigin: () => {
            return FIELD_ORIGIN.SOURCE;
          },
          supportsFieldMetaFromEs: () => {
            return true;
          },
          getSource: () => {
            return {
              isMvt: () => {
                return false;
              },
            };
          },
        } as unknown as IField;
        const options = {
          type: COLOR_MAP_TYPE.ORDINAL,
          color: 'Blues',
          fieldMetaOptions: { isEnabled: true },
        };

        const colorProperty = new DynamicColorProperty(
          options,
          VECTOR_STYLES.LINE_COLOR,
          field,
          {} as unknown as IVectorLayer,
          () => {
            return (value: RawValue) => value + '_format';
          }
        );
        colorProperty.getRangeFieldMeta = () => {
          return {
            min: 0,
            max: 100,
            delta: 100,
          };
        };

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

      test('should use `feature-state` for geojson source', async () => {
        const field = {
          getMbFieldName: () => {
            return 'foobar';
          },
          getSource: () => {
            return {
              isMvt: () => {
                return false;
              },
            };
          },
        } as unknown as IField;
        const layer = {} as unknown as IVectorLayer;
        const options = {
          type: COLOR_MAP_TYPE.ORDINAL,
          useCustomColorRamp: true,
          customColorRamp: [
            { stop: 10, color: '#f7faff' },
            { stop: 100, color: '#072f6b' },
          ],
          fieldMetaOptions: { isEnabled: true },
        };

        const colorProperty = new DynamicColorProperty(
          options,
          VECTOR_STYLES.LINE_COLOR,
          field,
          layer,
          () => {
            return (value: RawValue) => value + '_format';
          }
        );

        expect(colorProperty._getMbColor()).toEqual([
          'step',
          [
            'coalesce',
            [
              'case',
              ['==', ['feature-state', 'foobar'], null],
              9,
              ['max', ['min', ['to-number', ['feature-state', 'foobar']], 100], 10],
            ],
            9,
          ],
          'rgba(0,0,0,0)',
          10,
          '#f7faff',
          100,
          '#072f6b',
        ]);
      });

      test('should use `get` for MVT source', async () => {
        const field = {
          getMbFieldName: () => {
            return 'foobar';
          },
          getSource: () => {
            return {
              isMvt: () => {
                return true;
              },
            };
          },
        } as unknown as IField;
        const layer = {} as unknown as IVectorLayer;
        const options = {
          type: COLOR_MAP_TYPE.ORDINAL,
          useCustomColorRamp: true,
          customColorRamp: [
            { stop: 10, color: '#f7faff' },
            { stop: 100, color: '#072f6b' },
          ],
          fieldMetaOptions: { isEnabled: true },
        };

        const colorProperty = new DynamicColorProperty(
          options,
          VECTOR_STYLES.LINE_COLOR,
          field,
          layer,
          () => {
            return (value: RawValue) => value + '_format';
          }
        );

        expect(colorProperty._getMbColor()).toEqual([
          'step',
          [
            'coalesce',
            [
              'case',
              ['==', ['get', 'foobar'], null],
              9,
              ['max', ['min', ['to-number', ['get', 'foobar']], 100], 10],
            ],
            9,
          ],
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
  test('Should render OrdinalDataMappingPopover', () => {
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
});
