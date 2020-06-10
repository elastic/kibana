/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFormRow, EuiColorPalettePicker, EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { NUMERICAL_COLOR_PALETTES } from '../../color_palettes';
import {
  DEFAULT_RGB_HEATMAP_COLOR_RAMP,
  DEFAULT_HEATMAP_COLOR_RAMP_NAME,
  HEATMAP_COLOR_RAMP_LABEL,
} from './heatmap_constants';

const HEATMAP_COLOR_PALETTES = [
  {
    value: DEFAULT_HEATMAP_COLOR_RAMP_NAME,
    palette: DEFAULT_RGB_HEATMAP_COLOR_RAMP,
    type: 'gradient',
  },
  ...NUMERICAL_COLOR_PALETTES,
];

interface Props {
  colorRampName: string;
  onHeatmapColorChange: ({ colorRampName }: { colorRampName: string }) => void;
}

export function HeatmapStyleEditor({ colorRampName, onHeatmapColorChange }: Props) {
  const onColorRampChange = (selectedPaletteId: string) => {
    onHeatmapColorChange({
      colorRampName: selectedPaletteId,
    });
  };

  return (
    <EuiFormRow label={HEATMAP_COLOR_RAMP_LABEL} display="rowCompressed">
      <EuiColorPalettePicker
        palettes={HEATMAP_COLOR_PALETTES}
        onChange={onColorRampChange}
        valueOfSelected={colorRampName}
        compressed
      />
    </EuiFormRow>
  );
}
