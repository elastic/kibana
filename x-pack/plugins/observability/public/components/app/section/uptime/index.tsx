/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  Chart,
  DARK_THEME,
  LIGHT_THEME,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import d3 from 'd3';
import React, { Fragment, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { ThemeContext } from 'styled-components';
import { SectionContainer } from '../';
import { getDataHandler } from '../../../../data_handler';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { UptimeFetchDataResponse } from '../../../../typings';
import { formatStatValue } from '../../../../utils/format_stat_value';
import { ChartContainer } from '../../chart_container';
import { onBrushEnd } from '../helper';

interface Props {
  startTime?: string;
  endTime?: string;
  bucketSize?: string;
}

export const UptimeSection = ({ startTime, endTime, bucketSize }: Props) => {
  const theme = useContext(ThemeContext);
  const history = useHistory();

  const { data, status } = useFetcher(() => {
    if (startTime && endTime && bucketSize) {
      return getDataHandler('uptime')?.fetchData({ startTime, endTime, bucketSize });
    }
  }, [startTime, endTime, bucketSize]);

  const xCoordinates = data
    ? Object.values(data.series).flatMap((serie) =>
        serie.coordinates.map((coordinate) => coordinate.x)
      )
    : [0];

  const min = d3.min(xCoordinates);
  const max = d3.max(xCoordinates);

  const formatter = niceTimeFormatter([min, max]);

  const getSerieColor = (color?: string) => {
    if (color) {
      return theme.eui[color];
    }
  };

  const isLoading = status === FETCH_STATUS.LOADING;

  return (
    <SectionContainer
      minHeight={296}
      title={data?.title || 'Uptime'}
      subtitle={i18n.translate('xpack.observability.overview.chart.uptime.subtitle', {
        defaultMessage: 'Summary',
      })}
      appLink={data?.appLink}
    >
      <EuiFlexGroup>
        {data &&
          Object.keys(data.stats).map((key) => {
            const stat = data.stats[key as keyof UptimeFetchDataResponse['stats']];
            return (
              <EuiFlexItem key={key} grow={false}>
                <EuiStat
                  title={formatStatValue(stat)}
                  description={stat.label}
                  titleSize="s"
                  isLoading={isLoading}
                />
              </EuiFlexItem>
            );
          })}
      </EuiFlexGroup>
      <ChartContainer height={177} isLoading={isLoading}>
        <Chart size={{ height: 177 }}>
          <Settings
            onBrushEnd={({ x }) => onBrushEnd({ x, history })}
            theme={theme.darkMode ? DARK_THEME : LIGHT_THEME}
            showLegend
            legendPosition="bottom"
            xDomain={{ min, max }}
          />
          {data &&
            Object.keys(data.series).map((key) => {
              const serie = data.series[key as keyof UptimeFetchDataResponse['series']];
              const chartData = serie.coordinates.map((coordinate) => ({
                ...coordinate,
                g: serie.label,
              }));
              return (
                <Fragment key={key}>
                  <BarSeries
                    id={key}
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor={'x'}
                    yAccessors={['y']}
                    color={getSerieColor(serie.color)}
                    stackAccessors={['x']}
                    splitSeriesAccessors={['g']}
                    data={chartData}
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
                    tickFormat={(x: any) => numeral(x).format('0a')}
                  />
                </Fragment>
              );
            })}
        </Chart>
      </ChartContainer>
    </SectionContainer>
  );
};
