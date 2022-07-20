/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { Chart, BarSeries, PartialTheme, ScaleType, Settings } from '@elastic/charts';

import type { ChangePointHistogramItem } from '@kbn/ml-agg-utils';

interface MiniHistogramProps {
  chartData: ChangePointHistogramItem[];
  label: string;
}

export const MiniHistogram: FC<MiniHistogramProps> = ({ chartData, label }) => {
  const theme: PartialTheme = {
    chartMargins: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    chartPaddings: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    scales: {
      barsPadding: 0.1,
    },
  };

  return (
    <div
      style={{
        width: '80px',
        height: '24px',
        margin: '0px',
      }}
    >
      <Chart>
        <Settings theme={theme} showLegend={false} />
        <BarSeries
          id="doc_count_overall"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'key'}
          yAccessors={['doc_count_overall']}
          data={chartData}
          stackAccessors={[0]}
        />
        <BarSeries
          id={label}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'key'}
          yAccessors={['doc_count_change_point']}
          data={chartData}
          stackAccessors={[0]}
          color={['orange']}
        />
      </Chart>
    </div>
  );
};
