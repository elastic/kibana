/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LAYER_STYLE_TYPE, VectorStyleDescriptor } from '@kbn/maps-plugin/common';
import {
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  LABEL_BORDER_SIZES,
  LABEL_POSITIONS,
  STYLE_TYPE,
  SYMBOLIZE_AS_TYPES,
} from '@kbn/maps-plugin/common';

import type { StyleColorParams } from './style_color_params';

export enum PalleteColors {
  BluetoRed = 'Blue to Red',
  YellowtoRed = 'Yellow to Red',
}

export function getLayerStyle(
  fieldName: string,
  color: PalleteColors,
  styleColors: StyleColorParams
): VectorStyleDescriptor {
  const { lineColor, labelColor, labelOutlineColor } = styleColors;
  return {
    type: 'VECTOR' as LAYER_STYLE_TYPE.VECTOR,
    properties: {
      icon: { type: STYLE_TYPE.STATIC, options: { value: 'marker' } },
      fill_color: {
        type: STYLE_TYPE.DYNAMIC,
        options: {
          color,
          color_category: 'palette_0',
          field_meta_options: { is_enabled: true, sigma: 3 },
          type: COLOR_MAP_TYPE.ORDINAL,
          field: {
            name: fieldName,
            origin: FIELD_ORIGIN.JOIN,
          },
          use_custom_color_ramp: false,
        },
      },
      line_color: {
        type: STYLE_TYPE.DYNAMIC,
        options: { color: lineColor, field_meta_options: { is_enabled: true } },
      },
      line_width: { type: STYLE_TYPE.STATIC, options: { size: 1 } },
      icon_size: { type: STYLE_TYPE.STATIC, options: { size: 6 } },
      icon_orientation: {
        type: STYLE_TYPE.STATIC,
        options: { orientation: 0 },
      },
      label_text: {
        type: STYLE_TYPE.DYNAMIC,
        options: {
          field: {
            name: fieldName,
            origin: FIELD_ORIGIN.JOIN,
          },
        },
      },
      label_position: {
        options: {
          position: LABEL_POSITIONS.CENTER,
        },
      },
      label_zoom_range: {
        options: {
          use_layer_zoom_range: true,
          min_zoom: 0,
          max_zoom: 24,
        },
      },
      label_color: {
        type: STYLE_TYPE.STATIC,
        options: { color: labelColor },
      },
      label_size: { type: STYLE_TYPE.STATIC, options: { size: 14 } },
      label_border_color: {
        type: STYLE_TYPE.STATIC,
        options: { color: labelOutlineColor },
      },
      symbolize_as: { options: { value: SYMBOLIZE_AS_TYPES.CIRCLE } },
      label_border_size: { options: { size: LABEL_BORDER_SIZES.SMALL } },
    },
    is_time_aware: true,
  };
}
