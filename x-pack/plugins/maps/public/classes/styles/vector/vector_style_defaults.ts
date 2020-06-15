/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DEFAULT_ICON,
  LABEL_BORDER_SIZES,
  SYMBOLIZE_AS_TYPES,
  VECTOR_STYLES,
  STYLE_TYPE,
} from '../../../../common/constants';
import {
  COLOR_GRADIENTS,
  COLOR_PALETTES,
  DEFAULT_FILL_COLORS,
  DEFAULT_LINE_COLORS,
} from '../color_utils';
import { VectorStylePropertiesDescriptor } from '../../../../common/descriptor_types';
// @ts-ignore
import { getUiSettings } from '../../../kibana_services';

export const MIN_SIZE = 1;
export const MAX_SIZE = 64;
export const DEFAULT_MIN_SIZE = 7; // Make default large enough to fit default label size
export const DEFAULT_MAX_SIZE = 32;
export const DEFAULT_SIGMA = 3;
export const DEFAULT_LABEL_SIZE = 14;
export const DEFAULT_ICON_SIZE = 6;
export const DEFAULT_COLOR_RAMP = COLOR_GRADIENTS[0].value;
export const DEFAULT_COLOR_PALETTE = COLOR_PALETTES[0].value;

export const LINE_STYLES = [VECTOR_STYLES.LINE_COLOR, VECTOR_STYLES.LINE_WIDTH];
export const POLYGON_STYLES = [
  VECTOR_STYLES.FILL_COLOR,
  VECTOR_STYLES.LINE_COLOR,
  VECTOR_STYLES.LINE_WIDTH,
];

export function getDefaultProperties(mapColors: string[] = []): VectorStylePropertiesDescriptor {
  return {
    ...getDefaultStaticProperties(mapColors),
    [VECTOR_STYLES.SYMBOLIZE_AS]: {
      options: {
        value: SYMBOLIZE_AS_TYPES.CIRCLE,
      },
    },
    [VECTOR_STYLES.LABEL_BORDER_SIZE]: {
      options: {
        size: LABEL_BORDER_SIZES.SMALL,
      },
    },
  };
}

export function getDefaultStaticProperties(
  mapColors: string[] = []
): VectorStylePropertiesDescriptor {
  let nextColorIndex = 0;
  if (mapColors.length) {
    const lastColor = mapColors[mapColors.length - 1];
    if (DEFAULT_FILL_COLORS.includes(lastColor)) {
      nextColorIndex = (DEFAULT_FILL_COLORS.indexOf(lastColor) + 1) % DEFAULT_FILL_COLORS.length;
    }
  }
  const nextFillColor = DEFAULT_FILL_COLORS[nextColorIndex];
  const nextLineColor = DEFAULT_LINE_COLORS[nextColorIndex];

  const isDarkMode = getUiSettings().get('theme:darkMode', false);

  return {
    [VECTOR_STYLES.ICON]: {
      type: STYLE_TYPE.STATIC,
      options: {
        value: DEFAULT_ICON,
      },
    },
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: {
        color: nextFillColor,
      },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: {
        color: nextLineColor,
      },
    },
    [VECTOR_STYLES.LINE_WIDTH]: {
      type: STYLE_TYPE.STATIC,
      options: {
        size: 1,
      },
    },
    [VECTOR_STYLES.ICON_SIZE]: {
      type: STYLE_TYPE.STATIC,
      options: {
        size: DEFAULT_ICON_SIZE,
      },
    },
    [VECTOR_STYLES.ICON_ORIENTATION]: {
      type: STYLE_TYPE.STATIC,
      options: {
        orientation: 0,
      },
    },
    [VECTOR_STYLES.LABEL_TEXT]: {
      type: STYLE_TYPE.STATIC,
      options: {
        value: '',
      },
    },
    [VECTOR_STYLES.LABEL_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: {
        color: isDarkMode ? '#FFFFFF' : '#000000',
      },
    },
    [VECTOR_STYLES.LABEL_SIZE]: {
      type: STYLE_TYPE.STATIC,
      options: {
        size: DEFAULT_LABEL_SIZE,
      },
    },
    [VECTOR_STYLES.LABEL_BORDER_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: {
        color: isDarkMode ? '#000000' : '#FFFFFF',
      },
    },
  };
}

export function getDefaultDynamicProperties(): VectorStylePropertiesDescriptor {
  return {
    [VECTOR_STYLES.ICON]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        iconPaletteId: 'filledShapes',
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
        },
      },
    },
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        color: DEFAULT_COLOR_RAMP,
        colorCategory: DEFAULT_COLOR_PALETTE,
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        color: DEFAULT_COLOR_RAMP,
        colorCategory: DEFAULT_COLOR_PALETTE,
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.LINE_WIDTH]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        minSize: 1,
        maxSize: 10,
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.ICON_SIZE]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        minSize: DEFAULT_MIN_SIZE,
        maxSize: DEFAULT_MAX_SIZE,
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.ICON_ORIENTATION]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.LABEL_TEXT]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        field: undefined,
      },
    },
    [VECTOR_STYLES.LABEL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        color: DEFAULT_COLOR_RAMP,
        colorCategory: DEFAULT_COLOR_PALETTE,
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.LABEL_SIZE]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        minSize: DEFAULT_MIN_SIZE,
        maxSize: DEFAULT_MAX_SIZE,
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
    [VECTOR_STYLES.LABEL_BORDER_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        color: DEFAULT_COLOR_RAMP,
        colorCategory: DEFAULT_COLOR_PALETTE,
        field: undefined,
        fieldMetaOptions: {
          isEnabled: true,
          sigma: DEFAULT_SIGMA,
        },
      },
    },
  };
}
