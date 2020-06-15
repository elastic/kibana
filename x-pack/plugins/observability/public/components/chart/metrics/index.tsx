/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AreaSeries, Chart, DARK_THEME, LIGHT_THEME, ScaleType, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { ChartContainer } from '../container';
import { data } from './mock.data';

export const MetricsChart = () => {
  const theme = useContext(ThemeContext);
  return (
    <ChartContainer title={data.title} appLink={data.appLink}>
      <EuiFlexGroup>
        {data.stats.map((stat) => {
          return (
            <EuiFlexItem key={stat.label}>
              <EuiStat description={stat.label} title={stat.value} />
            </EuiFlexItem>
          );
        })}
        {data.series.map((serie) => {
          return (
            <EuiFlexItem key={serie.label}>
              <EuiStat description={serie.label} title={1}>
                <Chart size={{ height: 30, width: 100 }}>
                  <Settings
                    theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
                    showLegend={false}
                    tooltip="none"
                  />
                  <AreaSeries
                    id="area"
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor={'x'}
                    yAccessors={['y']}
                    data={serie.coordinates}
                  />
                </Chart>
              </EuiStat>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </ChartContainer>
  );
};
