/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Chart, Settings, BarSeries, ScaleType } from '@elastic/charts';
import { EuiLink, EuiSpacer } from '@elastic/eui';

// Data drift view
export const DataDriftView = () => {
  const data1 = [
    { x: 0, y: 2 },
    { x: 1, y: 7 },
    { x: 2, y: 3 },
    { x: 3, y: 6 },
  ];
  return (
    <div>
      <EuiSpacer size="m" />

      <div>
        <EuiLink
          href="https://elastic.github.io/eui/#/tabular-content/tables#a-basic-table"
          target="_blank"
        >
          Add EuiBasicTable below here
        </EuiLink>
      </div>
      <EuiSpacer size="m" />

      <div style={{ width: '100%', height: 500 }}>
        <EuiLink
          href="https://elastic.github.io/elastic-charts/?path=/story/bar-chart--bar-chart-1-y-1-g&globals=theme:light"
          target="_blank"
        >
          Example chart to be integrated into above table
        </EuiLink>
        <Chart>
          <Settings />
          <BarSeries
            id="data-drift-viz"
            name="Simple bar series"
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={data1}
          />
        </Chart>
      </div>
    </div>
  );
};
