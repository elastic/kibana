/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext, Fragment } from 'react';
import {
  Chart,
  Settings,
  DARK_THEME,
  LIGHT_THEME,
  BarSeries,
  ScaleType,
  Axis,
  Position,
  niceTimeFormatter,
} from '@elastic/charts';
import { ThemeContext } from 'styled-components';
import { euiPaletteColorBlind } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { FetchDataResponse } from '../../../typings/data_handler';
import { ChartContainer } from '../container';
import { Stats } from '../../stats';

interface Props {
  data?: FetchDataResponse;
}

export const StackedBarChart = ({ data }: Props) => {
  const theme = useContext(ThemeContext);

  if (!data) {
    return null;
  }

  const customColors = {
    colors: {
      vizColors: euiPaletteColorBlind({ rotations: Math.ceil(data.series.length / 10) }),
    },
  };

  const min = data.series[0]?.coordinates[0].x || 0;
  const max = data.series[0]?.coordinates[data.series[0]?.coordinates.length - 1].x || 0;
  const formatter = niceTimeFormatter([min, max]);

  const getSerieColor = (color?: string) => {
    if (color) {
      return theme.eui[color];
    }
  };

  return (
    <ChartContainer title={data.title} appLink={data.appLink}>
      <Stats stats={data.stats} formatter={(value: number) => numeral(value).format('0a')} />
      <Chart size={{ height: 220 }}>
        <Settings
          onBrushEnd={({ x }) => {
            console.log('#### Logs', x);
          }}
          theme={[customColors, theme.darkMode ? DARK_THEME : LIGHT_THEME]}
          showLegend
          legendPosition="bottom"
          xDomain={{ min, max }}
        />
        {data.series.map((serie) => {
          return (
            <Fragment key={serie.label}>
              <BarSeries
                id={serie.label}
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={'x'}
                yAccessors={['y']}
                color={getSerieColor(serie.color)}
                stackAccessors={['x']}
                data={serie.coordinates}
              />
              <Axis
                id="x-axis"
                position={Position.Bottom}
                showOverlappingTicks={false}
                showOverlappingLabels={false}
                tickFormat={formatter}
              />
              <Axis
                id="y-axis"
                showGridLines
                position={Position.Left}
                tickFormat={(d: any) => numeral(d).format('0a')}
              />
            </Fragment>
          );
        })}
      </Chart>
    </ChartContainer>
  );
};

{
  /* <ChartContainer title="Logs">
                <Chart>
                  <Settings
                    onBrushEnd={({ x }) => {
                      console.log('#### Logs', x);
                    }}
                    theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
                    showLegend
                    legendPosition="bottom"
                    xDomain={{ min: startAPM, max: endAPM }}
                  />
                  <Axis
                    id="bottom"
                    position={Position.Bottom}
                    showOverlappingTicks={false}
                    showOverlappingLabels={false}
                    tickFormat={formatterAPM}
                  />
                  <Axis
                    showGridLines
                    id="left2"
                    position={Position.Left}
                    tickFormat={(d: any) => numeral(d).format('0a')}
                  />

                  <BarSeries
                    id="averageValues"
                    xScaleType="time"
                    yScaleType="linear"
                    xAccessor={'time'}
                    yAccessors={['value']}
                    splitSeriesAccessors={['group']}
                    stackAccessors={['time']}
                    data={apmData}
                  />
                </Chart>
              </ChartContainer> */
}
