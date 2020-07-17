/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AbstractStyle } from '../style';
import { HeatmapStyleEditor } from './components/heatmap_style_editor';
import { HeatmapLegend } from './components/legend/heatmap_legend';
import { DEFAULT_HEATMAP_COLOR_RAMP_NAME, getOrdinalMbColorRampStops } from '../color_palettes';
import { LAYER_STYLE_TYPE, GRID_RESOLUTION } from '../../../../common/constants';

import { i18n } from '@kbn/i18n';
import { EuiIcon } from '@elastic/eui';

//The heatmap range chosen hear runs from 0 to 1. It is arbitrary.
//Weighting is on the raw count/sum values.
const MIN_RANGE = 0.1; // 0 to 0.1 is displayed as transparent color stop
const MAX_RANGE = 1;

export class HeatmapStyle extends AbstractStyle {
  static type = LAYER_STYLE_TYPE.HEATMAP;

  constructor(descriptor = {}) {
    super();
    this._descriptor = HeatmapStyle.createDescriptor(descriptor.colorRampName);
  }

  static createDescriptor(colorRampName) {
    return {
      type: HeatmapStyle.type,
      colorRampName: colorRampName ? colorRampName : DEFAULT_HEATMAP_COLOR_RAMP_NAME,
    };
  }

  static getDisplayName() {
    return i18n.translate('xpack.maps.style.heatmap.displayNameLabel', {
      defaultMessage: 'Heatmap style',
    });
  }

  renderEditor({ onStyleDescriptorChange }) {
    const onHeatmapColorChange = ({ colorRampName }) => {
      const styleDescriptor = HeatmapStyle.createDescriptor(colorRampName);
      onStyleDescriptorChange(styleDescriptor);
    };

    return (
      <HeatmapStyleEditor
        colorRampName={this._descriptor.colorRampName}
        onHeatmapColorChange={onHeatmapColorChange}
      />
    );
  }

  renderLegendDetails(field) {
    return <HeatmapLegend colorRampName={this._descriptor.colorRampName} field={field} />;
  }

  getIcon() {
    return <EuiIcon size="m" type="heatmap" />;
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
        values: { resolution },
      });
      throw new Error(errorMessage);
    }
    mbMap.setPaintProperty(layerId, 'heatmap-radius', radius);
    mbMap.setPaintProperty(layerId, 'heatmap-weight', {
      type: 'identity',
      property: propertyName,
    });

    const colorStops = getOrdinalMbColorRampStops(
      this._descriptor.colorRampName,
      MIN_RANGE,
      MAX_RANGE
    );
    if (colorStops) {
      mbMap.setPaintProperty(layerId, 'heatmap-color', [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(0, 0, 255, 0)',
        ...colorStops,
      ]);
    }
  }
}
