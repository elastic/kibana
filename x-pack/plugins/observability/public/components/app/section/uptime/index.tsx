/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  TickFormatter,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { ThemeContext } from 'styled-components';
import { SectionContainer } from '../';
import { getDataHandler } from '../../../../data_handler';
import { useChartTheme } from '../../../../hooks/use_chart_theme';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { Series } from '../../../../typings';
import { ChartContainer } from '../../chart_container';
import { StyledStat } from '../../styled_stat';
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

  const min = moment.utc(startTime).valueOf();
  const max = moment.utc(endTime).valueOf();
  const formatter = niceTimeFormatter([min, max]);

  const isLoading = status === FETCH_STATUS.LOADING;

  const { title = 'Uptime', appLink, stats, series } = data || {};

  const downColor = theme.eui.euiColorVis2;
  const upColor = theme.eui.euiColorLightShade;

  return (
    <SectionContainer
      minHeight={273}
      title={title}
      appLink={appLink}
      hasError={status === FETCH_STATUS.FAILURE}
    >
      <EuiFlexGroup>
        {/* Stats section */}
        <EuiFlexItem grow={false}>
          <StyledStat
            title={numeral(stats?.monitors.value).format('0a')}
            description={i18n.translate('xpack.observability.overview.uptime.monitors', {
              defaultMessage: 'Monitors',
            })}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StyledStat
            title={numeral(stats?.up.value).format('0a')}
            description={i18n.translate('xpack.observability.overview.uptime.up', {
              defaultMessage: 'Up',
            })}
            isLoading={isLoading}
            color={upColor}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StyledStat
            title={numeral(stats?.down.value).format('0a')}
            description={i18n.translate('xpack.observability.overview.uptime.down', {
              defaultMessage: 'Down',
            })}
            isLoading={isLoading}
            color={downColor}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Chart section */}
      <ChartContainer isInitialLoad={isLoading && !data}>
        <Settings
          onBrushEnd={({ x }) => onBrushEnd({ x, history })}
          theme={useChartTheme()}
          showLegend={false}
          legendPosition={Position.Right}
          xDomain={{ min, max }}
        />
        <UptimeBarSeries
          id="down"
          label={i18n.translate('xpack.observability.overview.uptime.chart.down', {
            defaultMessage: 'Down',
          })}
          series={series?.down}
          ticktFormatter={formatter}
          color={downColor}
        />
        <UptimeBarSeries
          id="up"
          label={i18n.translate('xpack.observability.overview.uptime.chart.up', {
            defaultMessage: 'Up',
          })}
          series={series?.up}
          ticktFormatter={formatter}
          color={upColor}
        />
      </ChartContainer>
    </SectionContainer>
  );
};

const UptimeBarSeries = ({
  id,
  label,
  series,
  color,
  ticktFormatter,
}: {
  id: string;
  label: string;
  series?: Series;
  color: string;
  ticktFormatter: TickFormatter;
}) => {
  if (!series) {
    return null;
  }
  const chartData = series.coordinates.map((coordinate) => ({
    ...coordinate,
    g: label,
  }));
  return (
    <>
      <BarSeries
        id={id}
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor={'x'}
        yAccessors={['y']}
        color={color}
        stackAccessors={['x']}
        splitSeriesAccessors={['g']}
        data={chartData}
      />
      <Axis
        id="x-axis"
        position={Position.Bottom}
        showOverlappingTicks={false}
        showOverlappingLabels={false}
        tickFormat={ticktFormatter}
      />
      <Axis
        id="y-axis"
        showGridLines
        position={Position.Left}
        tickFormat={(x: any) => numeral(x).format('0a')}
      />
    </>
  );
};
