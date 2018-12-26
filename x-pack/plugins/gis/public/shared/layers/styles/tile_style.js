/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class TileStyle {

  static type = 'TILE';

  constructor(styleDescriptor) {
    this._descriptor = styleDescriptor;
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === TileStyle;
  }

  static createDescriptor(properties) {
    return {
      type: TileStyle.type,
      properties
    };
  }

  static getDisplayName() {
    return 'Tile style';
  }

  _getMBOpacity() {
    const DEFAULT_OPACITY = 1;
    return typeof this._descriptor.properties.alphaValue === 'number' ? this._descriptor.properties.alphaValue : DEFAULT_OPACITY;
  }

  setMBPaintProperties(mbMap, tileLayerID) {
    const opacity = this._getMBOpacity();
    mbMap.setPaintProperty(tileLayerID, 'raster-opacity', opacity);
  }
}
