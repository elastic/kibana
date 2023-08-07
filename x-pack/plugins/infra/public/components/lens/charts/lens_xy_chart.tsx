/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormulaConfig, XYLayerOptions } from '../../../common/visualizations';
import { Layer } from '../../../hooks/use_lens_attributes';
import { BaseChartProps } from '../types';
import { LensChart } from './lens_chart';

export interface Props extends Omit<BaseChartProps, 'hidePanelTitles'> {
  layers: Array<Layer<XYLayerOptions, FormulaConfig[]>>;
}

const MIN_HEIGHT = 300;

export const LensXYChart = ({
  disableTriggers = false,
  height = MIN_HEIGHT,
  loading = false,
  ...props
}: Props) => {
  return (
    <LensChart
      {...props}
      borderRadius="m"
      disableTriggers={disableTriggers}
      loading={loading}
      height={height}
      visualizationType="lnsXY"
    />
  );
};
