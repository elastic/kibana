/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export class HeatmapStyle {

  static type = 'HEATMAP';

  constructor(styleDescriptor) {
    this._descriptor = styleDescriptor;
  }

  static canEdit(styleInstance) {
    return styleInstance.constructor === HeatmapStyle;
  }

  static createDescriptor() {
    return {
      type: HeatmapStyle.type
    };
  }

  static getDisplayName() {
    return 'Heatmap Settings';
  }

  static renderEditor({}) {
    return (<div>Here be heatmap style editor.</div>);
  }

  setMBPaintProperties(mbMap, pointLayerID, property) {
    mbMap.setPaintProperty(pointLayerID, 'heatmap-radius', 64);
    mbMap.setPaintProperty(pointLayerID, 'heatmap-weight', {
      "type": 'identity',
      "property": property
    });
  }

}
