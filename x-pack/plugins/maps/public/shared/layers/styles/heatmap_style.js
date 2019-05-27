/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { GRID_RESOLUTION } from '../grid_resolution';
import { AbstractStyle } from './abstract_style';
import { HeatmapLegend } from './components/heatmap/legend/heatmap_legend';
import { i18n } from '@kbn/i18n';

export class HeatmapStyle extends AbstractStyle {

  static type = 'HEATMAP';

  constructor() {
    super();
    this._descriptor = HeatmapStyle.createDescriptor();
  }

  static createDescriptor() {
    return {
      type: HeatmapStyle.type,
    };
  }

  static getDisplayName() {
    return i18n.translate('xpack.maps.style.heatmap.displayNameLabel', {
      defaultMessage: 'Heatmap style'
    });
  }

  getLegendDetails(label) {
    return (<HeatmapLegend colorRampName="theclassic" label={label} />);
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
      const errorMessage = i18n.translate('xpack.maps.style.heatmap.resolutionStyleErrorMessage', {
        defaultMessage: `Resolution param not recognized: {resolution}`,
        values: { resolution }
      });
      throw new Error(errorMessage);
    }
    mbMap.setPaintProperty(layerId, 'heatmap-radius', radius);
    mbMap.setPaintProperty(layerId, 'heatmap-weight', {
      type: 'identity',
      property: propertyName
    });
    /*
    "heatmap-color": [
                                "interpolate",
                                ["linear"],
                                ["heatmap-density"],
                                0, "rgba(0, 0, 255, 0)",
                                0.1, "royalblue",
                                0.3, "cyan",
                                0.5, "lime",
                                0.7, "yellow",
                                1, "red"
                            ]
    */
  }

}

