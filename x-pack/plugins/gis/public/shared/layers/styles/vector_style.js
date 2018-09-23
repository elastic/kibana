/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { VectorStyleEditor } from './components/vector_style_editor';

const DEFAULT_COLOR = '#e6194b';

export class VectorStyle {

  static type = 'VECTOR';
  static DEFAULT_COLOR_HEX = '#ffffff';
  static STYLE_TYPE = { 'DYNAMIC': 'DYNAMIC', 'STATIC': 'STATIC' };

  constructor(descriptor) {
    this._descriptor = descriptor;
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === VectorStyle;
  }

  static createDescriptor(fillAndOutlineDescriptor) {
    return {
      type: VectorStyle.type,
      properties: {
        fillAndOutline: fillAndOutlineDescriptor
      }
    };
  }

  static getDisplayName() {
    return 'Vector Style';
  }

  static renderEditor({ handleStyleChange, style, reset: resetStyle, layer }) {
    return (<VectorStyleEditor handleStyleChange={handleStyleChange} seedStyle={style} resetStyle={resetStyle} layer={layer}/>);
  }

  getHexColorForFillAndOutline() {
    try {
      return this._descriptor.properties.fillAndOutline.options.color;
    } catch(e) {
      console.warn('vector-style descriptor is not inialized correctly');
      return VectorStyle.DEFAULT_COLOR_HEX;
    }
  }

  _getDataDrivenColor() {
    if (this._descriptor.properties.fillAndOutline.options.field) {

      return [
        'interpolate',
        ['linear'],
        ['get', this._descriptor.properties.fillAndOutline.options.field],
        0, '#F2F12D',
        500000, '#EED322',
        750000, '#E6B71E',
        1000000, '#DA9C20',
        2500000, '#CA8323',
        5000000, '#B86B25',
        7500000, '#A25626',
        10000000, '#8B4225',
        25000000, '#723122'
      ];


    } else {
      return null;
    }
  }

  setMBPaintProperties(mbMap, fillLayerId, lineLayerId, pointLayerId, temp) {

    if (
      this._descriptor.properties.fillAndOutline.type === VectorStyle.STYLE_TYPE.STATIC ||
      !this._descriptor.properties.fillAndOutline.type //todo: style-descriptors shouldn't be empty like this
    ) {
      const color = this.getHexColorForFillAndOutline() || DEFAULT_COLOR;
      mbMap.setPaintProperty(fillLayerId, 'fill-color', color);
      mbMap.setPaintProperty(fillLayerId, 'fill-opacity', temp ? 0.4 : 0.5);
      mbMap.setPaintProperty(lineLayerId, 'line-color', color);
      mbMap.setPaintProperty(lineLayerId, 'line-opacity', temp ? 0.4 : 0.5);
      mbMap.setPaintProperty(lineLayerId, 'line-width', temp ? 1 : 2);
    } else if (this._descriptor.properties.fillAndOutline.type === VectorStyle.STYLE_TYPE.DYNAMIC) {
      const color = this._getDataDrivenColor();
      mbMap.setPaintProperty(fillLayerId, 'fill-color', color);
      mbMap.setPaintProperty(fillLayerId, 'fill-opacity', temp ? 0.4 : 0.5);
      mbMap.setPaintProperty(lineLayerId, 'line-color', color);
      mbMap.setPaintProperty(lineLayerId, 'line-opacity', temp ? 0.4 : 0.5);
      mbMap.setPaintProperty(lineLayerId, 'line-width', temp ? 1 : 2);
    } else {
      throw new Error('Style type not recognized');
    }
  }

  addMbPointsLayerAndSetMBPaintProperties(mbMap, sourceId, pointLayerId, temp) {
    if (
      this._descriptor.properties.fillAndOutline.type === VectorStyle.STYLE_TYPE.STATIC ||
      !this._descriptor.properties.fillAndOutline.type //todo: style-descriptors shouldn't be empty like this
    ) {
      const pointLayer = mbMap.getLayer(pointLayerId);
      if (!pointLayer) {
        mbMap.addLayer({
          id: pointLayerId,
          type: 'circle',
          source: sourceId,
          paint: {}
        });
      }
      const color = this.getHexColorForFillAndOutline() || DEFAULT_COLOR;
      mbMap.setPaintProperty(pointLayerId, 'circle-radius', 10);
      mbMap.setPaintProperty(pointLayerId, 'circle-color', color);
      mbMap.setPaintProperty(pointLayerId, 'circle-opacity', temp ? 0.4 : 0.5);
    } else if (this._descriptor.properties.fillAndOutline.type === VectorStyle.STYLE_TYPE.DYNAMIC) {
      const color = this._getDataDrivenColor();
      mbMap.setPaintProperty(pointLayerId, 'circle-radius', 10);
      mbMap.setPaintProperty(pointLayerId, 'circle-color', color);
      mbMap.setPaintProperty(pointLayerId, 'circle-opacity', temp ? 0.4 : 0.5);
    }
  }

}
