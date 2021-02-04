/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Axis, BarSeries, niceTimeFormatter, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, euiPaletteColorBlind, EuiSpacer, EuiTitle } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import moment from 'moment';
import React, { Fragment } from 'react';
import { useHistory } from 'react-router-dom';
import { SectionContainer } from '../';
import { getDataHandler } from '../../../../data_handler';
import { useChartTheme } from '../../../../hooks/use_chart_theme';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useHasData } from '../../../../hooks/use_has_data';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { LogsFetchDataResponse } from '../../../../typings';
import { formatStatValue } from '../../../../utils/format_stat_value';
import { ChartContainer } from '../../chart_container';
import { StyledStat } from '../../styled_stat';
import { onBrushEnd } from '../helper';

interface Props {
  bucketSize?: string;
}

function getColorPerItem(series?: LogsFetchDataResponse['series']) {
  if (!series) {
    return {};
  }
  const availableColors = euiPaletteColorBlind({
    rotations: Math.ceil(Object.keys(series).length / 10),
  });
  const colorsPerItem = Object.keys(series).reduce((acc: Record<string, string>, key, index) => {
    acc[key] = availableColors[index];
    return acc;
  }, {});

  return colorsPerItem;
}

export function LogsSection({ bucketSize }: Props) {
  const history = useHistory();
  const chartTheme = useChartTheme();
  const { forceUpdate, hasData } = useHasData();
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd } = useTimeRange();

  const { data, status } = useFetcher(
    () => {
      if (bucketSize) {
        return getDataHandler('infra_logs')?.fetchData({
          absoluteTime: { start: absoluteStart, end: absoluteEnd },
          relativeTime: { start: relativeStart, end: relativeEnd },
          bucketSize,
        });
      }
    },
    // Absolute times shouldn't be used here, since it would refetch on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucketSize, relativeStart, relativeEnd, forceUpdate]
  );

  if (!hasData.infra_logs?.hasData) {
    return null;
  }

  const min = moment.utc(absoluteStart).valueOf();
  const max = moment.utc(absoluteEnd).valueOf();

  const formatter = niceTimeFormatter([min, max]);

  const { appLink, stats, series } = data || {};

  const colorsPerItem = getColorPerItem(series);

  const isLoading = status === FETCH_STATUS.LOADING;

  return (
    <SectionContainer
      title={i18n.translate('xpack.observability.overview.logs.title', {
        defaultMessage: 'Logs',
      })}
      appLink={{
        href: appLink,
        label: i18n.translate('xpack.observability.overview.logs.appLink', {
          defaultMessage: 'View in app',
        }),
      }}
      hasError={status === FETCH_STATUS.FAILURE}
    >
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.observability.overview.logs.subtitle', {
            defaultMessage: 'Logs rate per minute',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        {!stats || isEmpty(stats) ? (
          <EuiFlexItem grow={false}>
            <StyledStat isLoading={isLoading} />
          </EuiFlexItem>
        ) : (
          Object.keys(stats).map((key) => {
            const stat = stats[key];
            return (
              <EuiFlexItem grow={false} key={key}>
                <StyledStat
                  title={formatStatValue(stat)}
                  description={stat.label}
                  isLoading={isLoading}
                  color={colorsPerItem[key]}
                />
              </EuiFlexItem>
            );
          })
        )}
      </EuiFlexGroup>
      <ChartContainer isInitialLoad={isLoading && !data}>
        <Settings
          onBrushEnd={({ x }) => onBrushEnd({ x, history })}
          theme={chartTheme}
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
                  gridLine={{ visible: true }}
                  position={Position.Left}
                  tickFormat={(d: number) => numeral(d).format('0a')}
                />
              </Fragment>
            );
          })}
      </ChartContainer>
    </SectionContainer>
  );
}
