/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { COLOR_GRADIENTS } from '../../color_utils';
import { ColorGradient } from '../../components/color_gradient';
import {
  DEFAULT_RGB_HEATMAP_COLOR_RAMP,
  DEFAULT_HEATMAP_COLOR_RAMP_NAME,
  HEATMAP_COLOR_RAMP_LABEL,
} from './heatmap_constants';

interface Props {
  colorRampName: string;
  onHeatmapColorChange: ({ colorRampName }: { colorRampName: string }) => void;
}

export function HeatmapStyleEditor({ colorRampName, onHeatmapColorChange }: Props) {
  const onColorRampChange = (selectedColorRampName: string) => {
    onHeatmapColorChange({
      colorRampName: selectedColorRampName,
    });
  };

  const colorRampOptions = [
    {
      value: DEFAULT_HEATMAP_COLOR_RAMP_NAME,
      text: DEFAULT_HEATMAP_COLOR_RAMP_NAME,
      inputDisplay: <ColorGradient colorRamp={DEFAULT_RGB_HEATMAP_COLOR_RAMP} />,
    },
    ...COLOR_GRADIENTS,
  ];

  return (
    <EuiFormRow label={HEATMAP_COLOR_RAMP_LABEL} display="rowCompressed">
      <EuiSuperSelect
        options={colorRampOptions}
        onChange={onColorRampChange}
        valueOfSelected={colorRampName}
        hasDividers={true}
        compressed
      />
    </EuiFormRow>
  );
}
