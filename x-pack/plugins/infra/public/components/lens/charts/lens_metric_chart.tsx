/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormulaConfig, MetricLayerOptions } from '../../../common/visualizations';
import { Layer } from '../../../hooks/use_lens_attributes';
import { LensChart } from './lens_chart';
import { TooltipContent } from '../metric_explanation/tooltip_content';
import { BaseChartProps } from '../types';

export interface Props extends Omit<BaseChartProps, 'overrides' | 'hidePanelTitles'> {
  layers: Layer<MetricLayerOptions, FormulaConfig, 'data'>;
  toolTip: string;
}

const MIN_HEIGHT = 150;

export const LensMetricChart = ({
  toolTip,
  disableTriggers = false,
  height = MIN_HEIGHT,
  loading = false,
  ...props
}: Props) => {
  return (
    <LensChart
      {...props}
      disableTriggers={disableTriggers}
      height={height}
      toolTip={<TooltipContent description={toolTip} />}
      visualizationType="lnsMetric"
      hidePanelTitles
    />
  );
};
