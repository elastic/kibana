/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorStyle } from './vector_style';
import { COLOR_GRADIENTS } from './color_utils';

export const DEFAULT_MIN_SIZE = 1;
export const DEFAULT_MAX_SIZE = 64;

export function getDefaultStaticProperties(nextColor = '#e6194b') {
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
        size: 10
      }
    },
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
        maxSize: 64
      }
    },
    iconSize: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        minSize: DEFAULT_MIN_SIZE,
        maxSize: DEFAULT_MAX_SIZE
      }
    },
  };
}
