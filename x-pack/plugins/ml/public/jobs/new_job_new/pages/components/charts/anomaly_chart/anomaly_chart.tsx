/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { Chart, Settings, TooltipType } from '@elastic/charts';
import { ModelItem, Anomaly } from '../../../../common/results_loader';
import { Anomalies } from './anomalies';
import { ModelBounds } from './model_bounds';
import { Line } from './line';
import { Axes } from '../common/axes';
import { getXRange } from '../common/utils';

interface Props {
  lineChartData: any[];
  modelData: ModelItem[];
  anomalyData: Anomaly[];
  height: string;
  width: string;
}

export const AnomalyChart: FC<Props> = ({
  lineChartData,
  modelData,
  anomalyData,
  height,
  width,
}) => {
  const xDomain = getXRange(lineChartData);

  return (
    <div style={{ width, height }}>
      <Chart>
        <Settings xDomain={xDomain} tooltip={TooltipType.None} />
        <Axes chartData={lineChartData} />
        <Anomalies anomalyData={anomalyData} />
        <ModelBounds modelData={modelData} />
        <Line lineChartData={lineChartData} />
      </Chart>
    </div>
  );
};
