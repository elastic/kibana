/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Chart, Settings, BarSeries, ScaleType } from '@elastic/charts';
import { FileBasedFieldVisConfig } from '../../types';
import { getTFPercentage } from '../../utils';

export const BooleanContentPreview = ({ config }: { config: FileBasedFieldVisConfig }) => {
  const formattedPercentages = getTFPercentage(config);
  if (!formattedPercentages) return null;
  return (
    <div className="mlDataGridChart__histogram">
      <Chart className="story-chart">
        <Settings
          showLegend={false}
          rotation={90}
          theme={{
            background: { color: 'transparent' },
            chartMargins: {
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            },
            chartPaddings: {
              left: 0,
              right: 0,
              top: 4,
              bottom: 0,
            },
            scales: { barsPadding: 0.1 },
          }}
        />
        <BarSeries
          id={'filebased-boolean-preview'}
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          stackAccessors={['x']}
          splitSeriesAccessors={['g']}
          data={[
            { x: 1, y: formattedPercentages.truePercentage, g: 'true' },
            { x: 1, y: formattedPercentages.falsePercentage, g: 'false' },
          ]}
        />
      </Chart>
    </div>
  );
};
