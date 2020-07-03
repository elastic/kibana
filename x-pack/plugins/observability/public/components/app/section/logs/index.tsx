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
import { EuiFlexGroup, EuiFlexItem, euiPaletteColorBlind, EuiStat } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { Fragment, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { ThemeContext } from 'styled-components';
import { SectionContainer } from '../';
import { getDataHandler } from '../../../../data_handler';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { LogsFetchDataResponse } from '../../../../typings';
import { formatStatValue } from '../../../../utils/format_stat_value';
import { ChartContainer } from '../../chart_container';
import { onBrushEnd } from '../helper';
import { StyledStat } from '../../styled_stat';

interface Props {
  startTime?: string;
  endTime?: string;
  bucketSize?: string;
}

export const LogsSection = ({ startTime, endTime, bucketSize }: Props) => {
  const theme = useContext(ThemeContext);
  const history = useHistory();

  const { data, status } = useFetcher(() => {
    if (startTime && endTime && bucketSize) {
      return getDataHandler('infra_logs')?.fetchData({ startTime, endTime, bucketSize });
    }
  }, [startTime, endTime, bucketSize]);

  const min = moment.utc(startTime).valueOf();
  const max = moment.utc(endTime).valueOf();

  const formatter = niceTimeFormatter([min, max]);

  const { title = 'Logs', appLink, stats, series } = data || {};

  const availableColors = euiPaletteColorBlind({
    rotations: data ? Math.ceil(Object.keys(data.series).length / 10) : 1,
  });
  const colorsPerItem = stats
    ? Object.keys(stats).reduce((acc: Record<string, string>, key, index) => {
        acc[key] = availableColors[index];
        return acc;
      }, {})
    : {};

  const customColors = {
    colors: {
      vizColors: euiPaletteColorBlind({
        rotations: data ? Math.ceil(Object.keys(data.series).length / 10) : 1,
      }),
    },
  };

  const isLoading = status === FETCH_STATUS.LOADING;

  return (
    <SectionContainer
      minHeight={296}
      title={title}
      subtitle={i18n.translate('xpack.observability.overview.chart.logs.subtitle', {
        defaultMessage: 'Logs rate',
      })}
      appLink={appLink}
      hasError={status === FETCH_STATUS.FAILURE}
    >
      <EuiFlexGroup>
        {stats &&
          Object.keys(stats).map((key) => {
            const stat = stats[key as keyof LogsFetchDataResponse['stats']];
            return (
              <EuiFlexItem key={key} grow={false}>
                <StyledStat
                  title={formatStatValue(stat)}
                  description={stat.label}
                  titleSize="s"
                  isLoading={isLoading}
                  color={colorsPerItem[key]}
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
            legendPosition={Position.Right}
            xDomain={{ min, max }}
            showLegendExtra
          />
          {series &&
            Object.keys(series).map((key) => {
              const serie = series[key];
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
                    stackAccessors={['x']}
                    splitSeriesAccessors={['g']}
                    data={chartData}
                    color={colorsPerItem[key]}
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
                    tickFormat={(d: number) => numeral(d).format('0a')}
                  />
                </Fragment>
              );
            })}
        </Chart>
      </ChartContainer>
    </SectionContainer>
  );
};
