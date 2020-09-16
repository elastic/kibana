/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
import { first, last } from 'lodash';
import { Axis, Chart, Settings, Position, niceTimeFormatter } from '@elastic/charts';
import { toMetricOpt } from '../../../../../../common/snapshot_metric_i18n';
import { MetricsExplorerAggregation } from '../../../../../../common/http_api';

import { Color } from '../../../../../../common/color_palette';
import { useSourceContext } from '../../../../../containers/source';
import { useTimeline } from '../../hooks/use_timeline';
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
import { useWaffleTimeContext } from '../../hooks/use_waffle_time';
import { useWaffleFiltersContext } from '../../hooks/use_waffle_filters';
import { MetricExplorerSeriesChart } from '../../../metrics_explorer/components/series_chart';
import { MetricsExplorerChartType } from '../../../metrics_explorer/hooks/use_metrics_explorer_options';
import { createFormatterForMetric } from '../../../metrics_explorer/components/helpers/create_formatter_for_metric';
import { calculateDomain } from '../../../metrics_explorer/components/helpers/calculate_domain';

import { euiStyled } from '../../../../../../../observability/public';

export const Timeline: React.FC<{ interval: string }> = ({ interval }) => {
  const { sourceId } = useSourceContext();
  const { metric, nodeType, accountId, region } = useWaffleOptionsContext();
  const { currentTime } = useWaffleTimeContext();
  const { filterQueryAsJson } = useWaffleFiltersContext();
  const { loading, error, timeseries } = useTimeline(
    filterQueryAsJson,
    [metric],
    nodeType,
    sourceId,
    currentTime,
    accountId,
    region,
    interval
  );

  const chartMetric = {
    color: Color.color0,
    aggregation: 'avg' as MetricsExplorerAggregation,
    label: toMetricOpt(metric.type)?.text,
  };

  const dateFormatter = useMemo(() => {
    if (!timeseries) return () => '';
    const firstTimestamp = first(timeseries.rows)?.timestamp;
    const lastTimestamp = last(timeseries.rows)?.timestamp;

    if (firstTimestamp == null || lastTimestamp == null) {
      return (value: number) => `${value}`;
    }

    return niceTimeFormatter([firstTimestamp, lastTimestamp]);
  }, [timeseries]);

  const yAxisFormater = useCallback(createFormatterForMetric(metric), [metric]);
  const dataDomain = timeseries ? calculateDomain(timeseries, [metric], false) : null;
  const domain = dataDomain
    ? {
        max: dataDomain.max * 1.1, // add 10% headroom.
        min: dataDomain.min,
      }
    : { max: 0, min: 0 };
  return (
    <TimelineContainer>
      {!loading && timeseries && (
        <Chart>
          <MetricExplorerSeriesChart
            type={MetricsExplorerChartType.area}
            metric={chartMetric}
            id="0"
            series={timeseries}
            stack={false}
          />
          <Axis
            id={'timestamp'}
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={dateFormatter}
          />
          <Axis id={'values'} position={Position.Left} tickFormat={yAxisFormater} domain={domain} />
          {/* <Settings tooltip={tooltipProps} theme={getChartTheme(isDarkMode)} /> */}
        </Chart>
      )}
    </TimelineContainer>
  );
};

const TimelineContainer = euiStyled.div`
  background-color: ${(props) => props.theme.eui.euiPageBackgroundColor};
  border-top: 1px solid ${(props) => props.theme.eui.euiColorLightShade};
  height: 200px;
  width: 100%;
  padding: ${(props) => props.theme.eui.paddingSizes.s} ${(props) =>
  props.theme.eui.paddingSizes.m};
`;
