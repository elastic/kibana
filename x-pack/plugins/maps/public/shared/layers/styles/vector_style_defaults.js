/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorStyle } from './vector_style';
import { SYMBOLIZE_AS_CIRCLE, DEFAULT_ICON_SIZE } from './vector_constants';
import { COLOR_GRADIENTS } from './color_utils';

const DEFAULT_COLORS = ['#e6194b', '#3cb44b', '#ffe119', '#f58231', '#911eb4'];
const DEFAULT_ICON = 'airfield';

export const DEFAULT_MIN_SIZE = 1;
export const DEFAULT_MAX_SIZE = 64;

export function getDefaultProperties(mapColors = []) {
  return {
    ...getDefaultStaticProperties(mapColors),
    symbol: {
      options: {
        symbolizeAs: SYMBOLIZE_AS_CIRCLE,
        symbolId: DEFAULT_ICON,
      }
    },
  };
}

export function getDefaultStaticProperties(mapColors = []) {
  // Colors must be state-aware to reduce unnecessary incrementation
  const lastColor = mapColors.pop();
  const nextColorIndex = (DEFAULT_COLORS.indexOf(lastColor) + 1) % (DEFAULT_COLORS.length - 1);
  const nextColor = DEFAULT_COLORS[nextColorIndex];

  return {
    fillColor: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        color: nextColor,
      }
    },
    lineColor: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        color: '#FFFFFF'
      }
    },
    lineWidth: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        size: 1
      }
    },
    iconSize: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {
        size: DEFAULT_ICON_SIZE
      }
    }
  };
}

export function getDefaultDynamicProperties() {
  return {
    fillColor: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        color: COLOR_GRADIENTS[0].value,
      }
    },
    lineColor: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        color: COLOR_GRADIENTS[0].value,
      }
    },
    lineWidth: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        minSize: DEFAULT_MIN_SIZE,
        maxSize: DEFAULT_MAX_SIZE
      }
    },
    iconSize: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        minSize: DEFAULT_MIN_SIZE,
        maxSize: DEFAULT_MAX_SIZE
      }
    }
  };
}
