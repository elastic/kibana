/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFormRow, EuiColorPalettePicker } from '@elastic/eui';
import { NUMERICAL_COLOR_PALETTES } from '../../color_palettes';
import { HEATMAP_COLOR_RAMP_LABEL } from './heatmap_constants';

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
        palettes={NUMERICAL_COLOR_PALETTES}
        onChange={onColorRampChange}
        valueOfSelected={colorRampName}
        compressed
      />
    </EuiFormRow>
  );
}
