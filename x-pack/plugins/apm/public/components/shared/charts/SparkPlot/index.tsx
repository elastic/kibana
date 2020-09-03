/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ScaleType, Chart, Settings, AreaSeries } from '@elastic/charts';
import { px } from '../../../../style/variables';
import { useChartTheme } from '../../../../../../observability/public';

interface Props {
  color: string;
  series: Array<{ x: number; y: number | null }>;
}

export function SparkPlot(props: Props) {
  const { series, color } = props;
  const theme = useChartTheme();

  return (
    <Chart size={{ height: px(24), width: px(64) }}>
      <Settings
        theme={{
          ...theme,
          background: {
            ...theme.background,
            color: 'transparent',
          },
        }}
        showLegend={false}
        tooltip="none"
      />
      <AreaSeries
        id="area"
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor={'x'}
        yAccessors={['y']}
        data={series}
        color={color}
      />
    </Chart>
  );
}
