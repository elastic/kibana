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

  isFillAndOutlineDynamic() {
    return this._descriptor.properties.fillAndOutline.type === VectorStyle.STYLE_TYPE.DYNAMIC;
  }

  enrichFeatureCollectionWithScaledProps(featureCollection) {

    if (!featureCollection) {
      return false;
    }

    if (!featureCollection.computed) {
      featureCollection.computed = [];
    }


    if (!this._descriptor.properties.fillAndOutline.options.field) {
      return;
    }

    if (featureCollection.computed.find(f => f === this._descriptor.properties.fillAndOutline.options.field)) {
      return false;
    }

    const features = featureCollection.features;
    if (!features.length) {
      return false;
    }
    const fieldName = this._descriptor.properties.fillAndOutline.options.field;
    let min = features[0].properties[fieldName];
    let max = features[0].properties[fieldName];
    for (let i = 1; i < features.length; i++) {
      min = Math.min(min, features[i].properties[fieldName]);
      max = Math.max(max, features[i].properties[fieldName]);
    }

    //scale to 0 -1
    const propName = `__kbn__${fieldName}__`;
    for (let i = 0; i < features.length; i++) {
      features[i].properties[propName] = (features[i].properties[fieldName] - min) / (max - min);
    }
    featureCollection.computed.push(fieldName);
    return true;
  }

  _getDataDrivenColor() {
    if (this._descriptor.properties.fillAndOutline.options.field) {
      const targetName = `__kbn__${this._descriptor.properties.fillAndOutline.options.field}__`;
      return [
        'interpolate',
        ['linear'],
        ['get', targetName],
        0 / 8, '#F2F12D',
        1 / 8, '#EED322',
        2 / 8, '#E6B71E',
        3 / 8, '#DA9C20',
        4 / 8, '#CA8323',
        5 / 8, '#B86B25',
        6 / 8, '#A25626',
        7 / 8, '#8B4225',
        8 / 8, '#723122'
      ];
    } else {
      return null;
    }
  }

  setMBPaintProperties(mbMap, sourceId, fillLayerId, lineLayerId, temp) {

    if (!mbMap.getLayer(fillLayerId)) {
      mbMap.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {}
      });
    }
    if (!mbMap.getLayer(lineLayerId)) {
      mbMap.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {}
      });
    }

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
