/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import {
  AreaSeries,
  Axis,
  BarSeries,
  Chart,
  CurveType,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getTimeZone } from '@kbn/observability-utils-browser/utils/ui_settings/get_timezone';
import { css } from '@emotion/css';
import { AbortableAsyncState } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { ESQLSearchResponse } from '@kbn/es-types';
import { esqlResultToTimeseries } from '../../util/esql_result_to_timeseries';
import { useKibana } from '../../hooks/use_kibana';
import { LoadingPanel } from '../loading_panel';

const END_ZONE_LABEL = i18n.translate('xpack.inventory.esqlChart.endzone', {
  defaultMessage:
    'The selected time range does not include this entire bucket. It might contain partial data.',
});

function getChartType(type: 'area' | 'bar' | 'line') {
  switch (type) {
    case 'area':
      return AreaSeries;
    case 'bar':
      return BarSeries;
    default:
      return LineSeries;
  }
}

export function ControlledEsqlChart<T extends string>({
  id,
  result,
  metricNames,
  chartType = 'line',
  height,
}: {
  id: string;
  result: AbortableAsyncState<ESQLSearchResponse>;
  metricNames: T[];
  chartType?: 'area' | 'bar' | 'line';
  height: number;
}) {
  const {
    core: { uiSettings },
  } = useKibana();

  const allTimeseries = useMemo(
    () =>
      esqlResultToTimeseries<T>({
        result,
        metricNames,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result, ...metricNames]
  );

  if (result.loading && !result.value?.values.length) {
    return (
      <LoadingPanel
        loading
        className={css`
          height: ${height}px;
        `}
      />
    );
  }

  const xValues = allTimeseries.flatMap(({ data }) => data.map(({ x }) => x));

  const min = Math.min(...xValues);
  const max = Math.max(...xValues);

  const isEmpty = min === 0 && max === 0;

  const xFormatter = niceTimeFormatter([min, max]);

  const xDomain = isEmpty ? { min: 0, max: 1 } : { min, max };

  const yTickFormat = (value: number | null) => (value === null ? '' : String(value));
  const yLabelFormat = (label: string) => label;

  const timeZone = getTimeZone(uiSettings);

  return (
    <Chart
      id={id}
      className={css`
        height: ${height}px;
      `}
    >
      <Tooltip
        stickTo="top"
        showNullValues={false}
        headerFormatter={({ value }) => {
          const formattedValue = xFormatter(value);
          if (max === value) {
            return (
              <>
                <EuiFlexGroup
                  alignItems="center"
                  responsive={false}
                  gutterSize="xs"
                  style={{ fontWeight: 'normal' }}
                >
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="iInCircle" />
                  </EuiFlexItem>
                  <EuiFlexItem>{END_ZONE_LABEL}</EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                {formattedValue}
              </>
            );
          }
          return formattedValue;
        }}
      />
      <Settings
        showLegend
        legendPosition={Position.Bottom}
        xDomain={xDomain}
        locale={i18n.getLocale()}
      />
      <Axis
        id="x-axis"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={xFormatter}
        gridLine={{ visible: false }}
      />
      <Axis
        id="y-axis"
        ticks={3}
        position={Position.Left}
        tickFormat={yTickFormat}
        labelFormat={yLabelFormat}
      />
      {allTimeseries.map((serie) => {
        const Series = getChartType(chartType);

        return (
          <Series
            timeZone={timeZone}
            key={serie.id}
            id={serie.id}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={serie.metricNames}
            data={serie.data}
            curve={CurveType.CURVE_MONOTONE_X}
          />
        );
      })}
    </Chart>
  );
}
