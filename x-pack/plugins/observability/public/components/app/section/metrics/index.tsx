/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AreaSeries, Chart, DARK_THEME, LIGHT_THEME, ScaleType, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiProgress } from '@elastic/eui';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { SectionContainer } from '../';
import { MetricsFetchDataResponse } from '../../../../typings/fetch_data_response';

interface Props {
  data?: MetricsFetchDataResponse;
}

export const MetricsSection = ({ data }: Props) => {
  const theme = useContext(ThemeContext);

  if (!data) {
    return null;
  }

  return (
    <SectionContainer title={data.title} appLink={data.appLink}>
      <EuiFlexGroup>
        {/* {data.stats.map((stat) => {
          return (
            <EuiFlexItem key={stat.label}>
              <EuiStat description={stat.label} title={stat.value}>
                <EuiProgress value={stat.value} max={100} />
              </EuiStat>
            </EuiFlexItem>
          );
        })} */}
        {Object.keys(data.series).map((key) => {
          const serie = data.series[key as keyof MetricsFetchDataResponse['series']];
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
    </SectionContainer>
  );
};
