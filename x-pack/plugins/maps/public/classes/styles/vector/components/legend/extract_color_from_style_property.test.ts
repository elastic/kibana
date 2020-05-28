/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractColorFromStyleProperty } from './extract_color_from_style_property';
import {
  ColorDynamicOptions,
  ColorDynamicStylePropertyDescriptor,
  ColorStaticOptions,
  ColorStaticStylePropertyDescriptor,
} from '../../../../../../common/descriptor_types';
import { COLOR_MAP_TYPE, FIELD_ORIGIN, STYLE_TYPE } from '../../../../../../common/constants';
// @ts-ignore
import { euiPaletteColorBlind } from '@elastic/eui/lib/services';

const blue = '#0000ff';
const yellow = '#ffff00';
const green = '#00FF00';
const purple = '#800080';
const defaultColor = '#FFFFFF';
const fieldMetaOptions = {
  isEnabled: true,
};
const field = {
  name: 'myField',
  origin: FIELD_ORIGIN.SOURCE,
};

describe('static', () => {
  test('Should return color', () => {
    const colorStyleProperty = {
      type: STYLE_TYPE.STATIC,
      options: {
        color: blue,
      } as ColorStaticOptions,
    } as ColorStaticStylePropertyDescriptor;
    expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(blue);
  });
});

describe('dynamic', () => {
  test('Should return default color when field is not provided', () => {
    const colorStyleProperty = {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        fieldMetaOptions,
      } as ColorDynamicOptions,
    } as ColorDynamicStylePropertyDescriptor;
    expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(defaultColor);
  });

  describe('categorical', () => {
    describe('predefined color palette', () => {
      test('Should return default color when color palette is not specified', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.CATEGORICAL,
            field,
            fieldMetaOptions,
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(defaultColor);
      });

      test('Should return first color from color palette', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.CATEGORICAL,
            colorCategory: 'palette_0',
            field,
            fieldMetaOptions,
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(
          euiPaletteColorBlind()[0]
        );
      });
    });

    describe('custom color palette', () => {
      test('Should return default color when custom color palette is not provided', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.CATEGORICAL,
            colorCategory: 'palette_0',
            field,
            fieldMetaOptions,
            useCustomColorPalette: true,
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(defaultColor);
      });

      test('Should return first color from custom color palette', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.CATEGORICAL,
            colorCategory: 'palette_0',
            field,
            fieldMetaOptions,
            useCustomColorPalette: true,
            customColorPalette: [{ stop: 'myCategory1', color: blue }],
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(blue);
      });
    });
  });

  describe('ordinal', () => {
    describe('predefined color ramp', () => {
      test('Should return default color when color ramp is not specified', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.ORDINAL,
            field,
            fieldMetaOptions,
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(defaultColor);
      });

      test('Should return center color from color ramp', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.ORDINAL,
            color: 'Blues',
            field,
            fieldMetaOptions,
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(
          'rgb(106,173,213)'
        );
      });
    });

    describe('custom color ramp', () => {
      test('Should return default color when custom color ramp is not provided', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.ORDINAL,
            field,
            fieldMetaOptions,
            useCustomColorRamp: true,
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(defaultColor);
      });

      test('Should return middle color from custom color ramp (odd # of stops)', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.ORDINAL,
            field,
            fieldMetaOptions,
            useCustomColorRamp: true,
            customColorRamp: [
              { stop: 0, color: blue },
              { stop: 5, color: green },
              { stop: 10, color: yellow },
            ],
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(green);
      });

      test('Should return middle color from custom color ramp (even # of stops)', () => {
        const colorStyleProperty = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            type: COLOR_MAP_TYPE.ORDINAL,
            field,
            fieldMetaOptions,
            useCustomColorRamp: true,
            customColorRamp: [
              { stop: 0, color: blue },
              { stop: 3, color: purple },
              { stop: 6, color: green },
              { stop: 10, color: yellow },
            ],
          } as ColorDynamicOptions,
        } as ColorDynamicStylePropertyDescriptor;
        expect(extractColorFromStyleProperty(colorStyleProperty, defaultColor)).toBe(purple);
      });
    });
  });
});
