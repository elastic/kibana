/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getDefaultStyleProperties } from './style_defaults';

export class TileStyle {

  static type = 'TILE';

  constructor(styleDescriptor = {}) {
    this._descriptor = TileStyle.createDescriptor(styleDescriptor.properties);
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === TileStyle;
  }

  static createDescriptor(properties = {}) {
    return {
      type: TileStyle.type,
      properties: {
        ...getDefaultStyleProperties(true),
        ...properties,
      }
    };
  }

  static getDisplayName() {
    return 'Tile style';
  }

  _getMBOpacity() {
    return this._descriptor.properties.alphaValue;
  }

  setMBPaintProperties(mbMap, tileLayerID) {
    const opacity = this._getMBOpacity();
    mbMap.setPaintProperty(tileLayerID, 'raster-opacity', opacity);
  }
}
