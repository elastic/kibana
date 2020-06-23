/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useContext } from 'react';
import d3 from 'd3';
import {
  Chart,
  Settings,
  BarSeries,
  Axis,
  Position,
  DARK_THEME,
  LIGHT_THEME,
  ScaleType,
  niceTimeFormatter,
} from '@elastic/charts';
import { ThemeContext } from 'styled-components';
import numeral from '@elastic/numeral';
import { UptimeFetchDataResponse } from '../../../../typings/fetch_data_response';
import { SectionContainer } from '../';

interface Props {
  data?: UptimeFetchDataResponse;
}

export const UptimeSection = ({ data }: Props) => {
  const theme = useContext(ThemeContext);

  if (!data) {
    return null;
  }

  const xCoordinates = Object.values(data.series)
    .map((serie) => serie.coordinates.map((coordinate) => coordinate.x))
    .flatMap((_) => _);

  const min = d3.min(xCoordinates);
  const max = d3.max(xCoordinates);

  const formatter = niceTimeFormatter([min, max]);

  const getSerieColor = (color?: string) => {
    if (color) {
      return theme.eui[color];
    }
  };

  return (
    <SectionContainer title={data.title} appLink={data.appLink}>
      {/* <Stats stats={data.stats} formatter={(value: number) => numeral(value).format('0a')} /> */}
      <Chart size={{ height: 220 }}>
        <Settings
          onBrushEnd={({ x }) => {
            console.log('#### Logs', x);
          }}
          theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
          showLegend
          legendPosition="bottom"
          xDomain={{ min, max }}
        />
        {Object.values(data.series).map((serie) => {
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
    </SectionContainer>
  );
};
