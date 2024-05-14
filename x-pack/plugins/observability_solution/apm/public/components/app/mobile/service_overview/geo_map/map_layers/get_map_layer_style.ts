/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  VectorStyleDescriptor,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  LABEL_BORDER_SIZES,
  LABEL_POSITIONS,
  STYLE_TYPE,
  SYMBOLIZE_AS_TYPES,
} from '@kbn/maps-plugin/common';

export enum PalleteColors {
  BluetoRed = 'Blue to Red',
  YellowtoRed = 'Yellow to Red',
}

export function getLayerStyle(fieldName: string, color: PalleteColors): VectorStyleDescriptor {
  return {
    type: 'VECTOR',
    properties: {
      icon: { type: STYLE_TYPE.STATIC, options: { value: 'marker' } },
      fillColor: {
        type: STYLE_TYPE.DYNAMIC,
        options: {
          color,
          colorCategory: 'palette_0',
          fieldMetaOptions: { isEnabled: true, sigma: 3 },
          type: COLOR_MAP_TYPE.ORDINAL,
          field: {
            name: fieldName,
            origin: FIELD_ORIGIN.JOIN,
          },
          useCustomColorRamp: false,
        },
      },
      lineColor: {
        type: STYLE_TYPE.DYNAMIC,
        options: { color: '#3d3d3d', fieldMetaOptions: { isEnabled: true } },
      },
      lineWidth: { type: STYLE_TYPE.STATIC, options: { size: 1 } },
      iconSize: { type: STYLE_TYPE.STATIC, options: { size: 6 } },
      iconOrientation: {
        type: STYLE_TYPE.STATIC,
        options: { orientation: 0 },
      },
      labelText: {
        type: STYLE_TYPE.DYNAMIC,
        options: {
          field: {
            name: fieldName,
            origin: FIELD_ORIGIN.JOIN,
          },
        },
      },
      labelPosition: {
        options: {
          position: LABEL_POSITIONS.CENTER,
        },
      },
      labelZoomRange: {
        options: {
          useLayerZoomRange: true,
          minZoom: 0,
          maxZoom: 24,
        },
      },
      labelColor: {
        type: STYLE_TYPE.STATIC,
        options: { color: '#3d3d3d' },
      },
      labelSize: { type: STYLE_TYPE.STATIC, options: { size: 14 } },
      labelBorderColor: {
        type: STYLE_TYPE.STATIC,
        options: { color: '#FFFFFF' },
      },
      symbolizeAs: { options: { value: SYMBOLIZE_AS_TYPES.CIRCLE } },
      labelBorderSize: { options: { size: LABEL_BORDER_SIZES.SMALL } },
    },
    isTimeAware: true,
  };
}
