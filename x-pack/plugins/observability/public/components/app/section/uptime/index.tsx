/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BarSeries,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  TickFormatter,
  XYBrushEvent,
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
import { useHasData } from '../../../../hooks/use_has_data';
import { useDatePickerContext } from '../../../../hooks/use_date_picker_context';
import { Series } from '../../../../typings';
import { ChartContainer } from '../../chart_container';
import { StyledStat } from '../../styled_stat';
import { onBrushEnd } from '../helper';
import { BucketSize } from '../../../../pages/overview';

interface Props {
  bucketSize: BucketSize;
}

export function UptimeSection({ bucketSize }: Props) {
  const theme = useContext(ThemeContext);
  const chartTheme = useChartTheme();
  const history = useHistory();
  const { forceUpdate, hasDataMap } = useHasData();
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd, lastUpdated } =
    useDatePickerContext();

  const { data, status } = useFetcher(
    () => {
      if (bucketSize && absoluteStart && absoluteEnd) {
        return getDataHandler('synthetics')?.fetchData({
          absoluteTime: { start: absoluteStart, end: absoluteEnd },
          relativeTime: { start: relativeStart, end: relativeEnd },
          ...bucketSize,
        });
      }
    },
    // `forceUpdate` and `lastUpdated` should trigger a reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucketSize, relativeStart, relativeEnd, absoluteStart, absoluteEnd, forceUpdate, lastUpdated]
  );

  if (!hasDataMap.synthetics?.hasData) {
    return null;
  }

  const min = moment.utc(absoluteStart).valueOf();
  const max = moment.utc(absoluteEnd).valueOf();

  const formatter = niceTimeFormatter([min, max]);

  const isLoading = status === FETCH_STATUS.LOADING;

  const { appLink, stats, series } = data || {};

  const downColor = theme.eui.euiColorVis2;
  const upColor = theme.eui.euiColorMediumShade;

  return (
    <SectionContainer
      title={i18n.translate('xpack.observability.overview.uptime.title', {
        defaultMessage: 'Monitors',
      })}
      appLink={{
        href: appLink,
        label: i18n.translate('xpack.observability.overview.uptime.appLink', {
          defaultMessage: 'Show monitors',
        }),
      }}
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
          onBrushEnd={(event) => onBrushEnd({ x: (event as XYBrushEvent).x, history })}
          theme={chartTheme}
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
          tickFormatter={formatter}
          color={downColor}
        />
        <UptimeBarSeries
          id="up"
          label={i18n.translate('xpack.observability.overview.uptime.chart.up', {
            defaultMessage: 'Up',
          })}
          series={series?.up}
          tickFormatter={formatter}
          color={upColor}
        />
      </ChartContainer>
    </SectionContainer>
  );
}

function UptimeBarSeries({
  id,
  label,
  series,
  color,
  tickFormatter,
}: {
  id: string;
  label: string;
  series?: Series;
  color: string;
  tickFormatter: TickFormatter;
}) {
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
        tickFormat={tickFormatter}
      />
      <Axis
        id="y-axis"
        gridLine={{ visible: true }}
        position={Position.Left}
        tickFormat={(x: any) => numeral(x).format('0a')}
      />
    </>
  );
}
