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

  constructor(descriptor) {
    this._descriptor = descriptor;
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === VectorStyle;
  }

  static createDescriptor(color) {
    return {
      type: VectorStyle.type,
      color: color
    };
  }

  static getDisplayName() {
    return 'Vector Styles';
  }

  static renderEditor({ handleStyleChange, style, reset: resetStyle }) {
    return (<VectorStyleEditor handleStyleChange={handleStyleChange} seedStyle={style} resetStyle={resetStyle}/>);
  }

  getHexColor() {
    return this._descriptor.color;
  }

  setMBPaintProperties(mbMap, fillLayerId, lineLayerId, pointLayerId, temp) {
    const color = this.getHexColor() || DEFAULT_COLOR;
    mbMap.setPaintProperty(fillLayerId, 'fill-color', color);
    mbMap.setPaintProperty(fillLayerId, 'fill-opacity', temp ? 0.4 : 0.5);
    mbMap.setPaintProperty(lineLayerId, 'line-color', color);
    mbMap.setPaintProperty(lineLayerId, 'line-opacity', temp ? 0.4 : 0.5);
    mbMap.setPaintProperty(lineLayerId, 'line-width', temp ? 1 : 2);
  }

  addMbPointsLayerAndSetMBPaintProperties(mbMap, sourceId, pointLayerId, temp) {
    const pointLayer = mbMap.getLayer(pointLayerId);
    if (!pointLayer) {
      mbMap.addLayer({
        id: pointLayerId,
        type: 'circle',
        source: sourceId,
        paint: {}
      });
    }
    const color = this.getHexColor() || DEFAULT_COLOR;
    mbMap.setPaintProperty(pointLayerId, 'circle-radius', 10);
    mbMap.setPaintProperty(pointLayerId, 'circle-color', color);
    mbMap.setPaintProperty(pointLayerId, 'circle-opacity', temp ? 0.4 : 0.5);
  }

}
