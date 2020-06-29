/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, Fragment } from 'react';
import d3 from 'd3';
import {
  Chart,
  Settings,
  DARK_THEME,
  LIGHT_THEME,
  BarSeries,
  ScaleType,
  niceTimeFormatter,
  Axis,
  Position,
} from '@elastic/charts';
import { ThemeContext } from 'styled-components';
import { euiPaletteColorBlind } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { formatStatValue } from '../../../../utils/format_stat_value';
import { SectionContainer } from '../';
import { LogsFetchDataResponse } from '../../../../typings/fetch_data_response';
import { getDataHandler } from '../../../../data_handler';

interface Props {
  startTime?: string;
  endTime?: string;
  bucketSize?: string;
}

export const LogsSection = ({ startTime, endTime, bucketSize }: Props) => {
  const theme = useContext(ThemeContext);

  const { data, status } = useFetcher(() => {
    if (startTime && endTime && bucketSize) {
      return getDataHandler('infra_logs')?.fetchData({ startTime, endTime, bucketSize });
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

  const customColors = {
    colors: {
      vizColors: euiPaletteColorBlind({
        rotations: data ? Math.ceil(Object.keys(data.series).length / 10) : 1,
      }),
    },
  };

  return (
    <SectionContainer
      minHeight={296}
      title={data?.title || 'Logs'}
      subtitle={i18n.translate('xpack.observability.overview.chart.logs.subtitle', {
        defaultMessage: 'Logs rate',
      })}
      appLink={data?.appLink}
    >
      <EuiFlexGroup>
        {data &&
          Object.keys(data.stats).map((key) => {
            const stat = data.stats[key as keyof LogsFetchDataResponse['stats']];
            return (
              <EuiFlexItem key={key} grow={false}>
                <EuiStat
                  title={formatStatValue(stat)}
                  description={stat.label}
                  titleSize="s"
                  isLoading={status === FETCH_STATUS.LOADING}
                />
              </EuiFlexItem>
            );
          })}
      </EuiFlexGroup>
      <Chart size={{ height: 177 }}>
        <Settings
          onBrushEnd={({ x }) => {}}
          theme={[customColors, theme.darkMode ? DARK_THEME : LIGHT_THEME]}
          showLegend
          legendPosition="bottom"
          xDomain={{ min, max }}
        />
        {data &&
          Object.keys(data.series).map((key) => {
            const serie = data.series[key];
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
    </SectionContainer>
  );
};
