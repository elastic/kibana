/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GRID_RESOLUTION } from '../grid_resolution';

export class HeatmapStyle {

  static type = 'HEATMAP';

  constructor(styleDescriptor = {}) {
    this._descriptor = HeatmapStyle.createDescriptor(
      styleDescriptor.refinement,
      styleDescriptor.properties
    );
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === HeatmapStyle;
  }

  static createDescriptor(refinement, properties = {}) {
    return {
      type: HeatmapStyle.type,
      refinement: refinement || 'coarse',
      properties: {
        ...properties
      }
    };
  }

  static getDisplayName() {
    return 'Heatmap style';
  }

  static renderEditor() {
    return null;
  }

  setMBPaintProperties({ alpha, mbMap, layerId, propertyName, resolution }) {
    let radius;
    if (resolution === GRID_RESOLUTION.COARSE) {
      radius = 64;
    } else if (resolution === GRID_RESOLUTION.FINE) {
      radius = 32;
    } else if (resolution === GRID_RESOLUTION.MOST_FINE) {
      radius = 16;
    } else {
      throw new Error(`Refinement param not recognized: ${this._descriptor.refinement}`);
    }
    mbMap.setPaintProperty(layerId, 'heatmap-radius', radius);
    mbMap.setPaintProperty(layerId, 'heatmap-weight', {
      type: 'identity',
      property: propertyName
    });
    mbMap.setPaintProperty(layerId, 'heatmap-opacity', alpha);
  }

}

