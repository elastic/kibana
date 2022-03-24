/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import { EuiIcon } from '@elastic/eui';
import { IStyle } from '../style';
import { HeatmapStyleEditor } from './components/heatmap_style_editor';
import { HeatmapLegend } from './components/legend/heatmap_legend';
import { DEFAULT_HEATMAP_COLOR_RAMP_NAME, getOrdinalMbColorRampStops } from '../color_palettes';
import { LAYER_STYLE_TYPE, GRID_RESOLUTION } from '../../../../common/constants';
import { HeatmapStyleDescriptor, StyleDescriptor } from '../../../../common/descriptor_types';
import { IField } from '../../fields/field';

// The heatmap range chosen hear runs from 0 to 1. It is arbitrary.
// Weighting is on the raw count/sum values.
const MIN_RANGE = 0.1; // 0 to 0.1 is displayed as transparent color stop
const MAX_RANGE = 1;

export class HeatmapStyle implements IStyle {
  readonly _descriptor: HeatmapStyleDescriptor;

  constructor(
    descriptor: { colorRampName: string } = { colorRampName: DEFAULT_HEATMAP_COLOR_RAMP_NAME }
  ) {
    this._descriptor = HeatmapStyle.createDescriptor(descriptor.colorRampName);
  }

  static createDescriptor(colorRampName?: string) {
    return {
      type: LAYER_STYLE_TYPE.HEATMAP,
      colorRampName: colorRampName ? colorRampName : DEFAULT_HEATMAP_COLOR_RAMP_NAME,
    };
  }

  getType() {
    return LAYER_STYLE_TYPE.HEATMAP;
  }

  renderEditor(onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void) {
    const onHeatmapColorChange = ({ colorRampName }: { colorRampName: string }) => {
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

  renderLegendDetails(field: IField) {
    return <HeatmapLegend colorRampName={this._descriptor.colorRampName} field={field} />;
  }

  getIcon() {
    return <EuiIcon size="m" type="heatmap" />;
  }

  setMBPaintProperties({
    mbMap,
    layerId,
    propertyName,
    max,
    resolution,
  }: {
    mbMap: MbMap;
    layerId: string;
    propertyName: string;
    max: number;
    resolution: GRID_RESOLUTION;
  }) {
    let radius;
    if (resolution === GRID_RESOLUTION.COARSE) {
      radius = 128;
    } else if (resolution === GRID_RESOLUTION.FINE) {
      radius = 64;
    } else if (resolution === GRID_RESOLUTION.MOST_FINE) {
      radius = 32;
    } else {
      radius = 8;
    }
    mbMap.setPaintProperty(layerId, 'heatmap-radius', radius);
    if (max <= 0) {
      mbMap.setPaintProperty(layerId, 'heatmap-weight', 0);
    } else {
      mbMap.setPaintProperty(layerId, 'heatmap-weight', ['/', ['get', propertyName], max]);
    }

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
