/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GRID_RESOLUTION } from '../grid_resolution';
import { AbstractStyle } from './abstract_style';

export class HeatmapStyle extends AbstractStyle {

  static type = 'HEATMAP';

  constructor() {
    super();
    this._descriptor = HeatmapStyle.createDescriptor();
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === HeatmapStyle;
  }

  static createDescriptor() {
    return {
      type: HeatmapStyle.type,
    };
  }

  static getDisplayName() {
    return 'Heatmap style';
  }

  static renderEditor() {
    return null;
  }

  setMBPaintProperties({ mbMap, layerId, propertyName, resolution }) {
    let radius;
    if (resolution === GRID_RESOLUTION.COARSE) {
      radius = 128;
    } else if (resolution === GRID_RESOLUTION.FINE) {
      radius = 64;
    } else if (resolution === GRID_RESOLUTION.MOST_FINE) {
      radius = 32;
    } else {
      throw new Error(`Resolution param not recognized: ${this._descriptor.refinement}`);
    }
    mbMap.setPaintProperty(layerId, 'heatmap-radius', radius);
    mbMap.setPaintProperty(layerId, 'heatmap-weight', {
      type: 'identity',
      property: propertyName
    });
  }

}

