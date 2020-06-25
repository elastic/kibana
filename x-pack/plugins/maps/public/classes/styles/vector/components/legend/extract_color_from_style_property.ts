/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { getColorRampCenterColor, getColorPalette } from '../../../color_utils';
import { COLOR_MAP_TYPE, STYLE_TYPE } from '../../../../../../common/constants';
import {
  ColorDynamicOptions,
  ColorStylePropertyDescriptor,
} from '../../../../../../common/descriptor_types';

export function extractColorFromStyleProperty(
  colorStyleProperty: ColorStylePropertyDescriptor | undefined,
  defaultColor: string
): string {
  if (!colorStyleProperty) {
    return defaultColor;
  }

  if (colorStyleProperty.type === STYLE_TYPE.STATIC) {
    return colorStyleProperty.options.color;
  }

  const dynamicOptions: ColorDynamicOptions = colorStyleProperty.options;

  // Do not use dynamic color unless configuration is complete
  if (!dynamicOptions.field || !dynamicOptions.field.name) {
    return defaultColor;
  }

  if (dynamicOptions.type === COLOR_MAP_TYPE.CATEGORICAL) {
    if (dynamicOptions.useCustomColorPalette) {
      return dynamicOptions.customColorPalette && dynamicOptions.customColorPalette.length
        ? dynamicOptions.customColorPalette[0].color
        : defaultColor;
    }

    if (!dynamicOptions.colorCategory) {
      return defaultColor;
    }

    const palette = getColorPalette(dynamicOptions.colorCategory);
    return palette ? palette[0] : defaultColor;
  } else {
    // return middle of gradient for dynamic style property
    if (dynamicOptions.useCustomColorRamp) {
      if (!dynamicOptions.customColorRamp || !dynamicOptions.customColorRamp.length) {
        return defaultColor;
      }
      // favor the lowest color in even arrays
      const middleIndex = Math.floor((dynamicOptions.customColorRamp.length - 1) / 2);
      return dynamicOptions.customColorRamp[middleIndex].color;
    }

    if (!dynamicOptions.color) {
      return defaultColor;
    }
    const centerColor = getColorRampCenterColor(dynamicOptions.color);
    return centerColor ? centerColor : defaultColor;
  }
}
