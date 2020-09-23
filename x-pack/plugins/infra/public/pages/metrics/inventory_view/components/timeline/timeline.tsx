/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import { first, last } from 'lodash';
import { EuiLoadingChart, EuiText, EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import {
  Axis,
  Chart,
  Settings,
  Position,
  TooltipValue,
  niceTimeFormatter,
  ElementClickListener,
} from '@elastic/charts';
import { useUiSetting } from '../../../../../../../../../src/plugins/kibana_react/public';
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
import { getTimelineChartTheme } from '../../../metrics_explorer/components/helpers/get_chart_theme';
import { calculateDomain } from '../../../metrics_explorer/components/helpers/calculate_domain';

import { euiStyled } from '../../../../../../../observability/public';
import { InfraFormatter } from '../../../../../lib/lib';

interface Props {
  interval: string;
  yAxisFormatter: InfraFormatter;
  isVisible: boolean;
}

export const Timeline: React.FC<Props> = ({ interval, yAxisFormatter, isVisible }) => {
  const { sourceId } = useSourceContext();
  const { metric, nodeType, accountId, region } = useWaffleOptionsContext();
  const { currentTime, jumpToTime, stopAutoReload } = useWaffleTimeContext();
  const { filterQueryAsJson } = useWaffleFiltersContext();
  const { loading, error, timeseries, reload } = useTimeline(
    filterQueryAsJson,
    [metric],
    nodeType,
    sourceId,
    currentTime,
    accountId,
    region,
    interval,
    isVisible
  );

  const metricLabel = toMetricOpt(metric.type)?.textLC;

  const chartMetric = {
    color: Color.color0,
    aggregation: 'avg' as MetricsExplorerAggregation,
    label: metricLabel,
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

  const isDarkMode = useUiSetting<boolean>('theme:darkMode');
  const tooltipProps = {
    headerFormatter: (tooltipValue: TooltipValue) =>
      moment(tooltipValue.value).format('Y-MM-DD HH:mm:ss.SSS'),
  };

  const dataDomain = timeseries ? calculateDomain(timeseries, [chartMetric], false) : null;
  const domain = dataDomain
    ? {
        max: dataDomain.max * 1.1, // add 10% headroom.
        min: dataDomain.min,
      }
    : { max: 0, min: 0 };

  const onClickPoint: ElementClickListener = useCallback(
    ([[geometryValue]]) => {
      if (!Array.isArray(geometryValue)) {
        const { x: timestamp } = geometryValue;
        jumpToTime(timestamp);
        stopAutoReload();
      }
    },
    [jumpToTime, stopAutoReload]
  );

  if (loading) {
    return (
      <TimelineContainer>
        <TimelineLoadingContainer>
          <EuiLoadingChart size="xl" />
        </TimelineLoadingContainer>
      </TimelineContainer>
    );
  }

  if (!loading && (error || !timeseries)) {
    return (
      <TimelineContainer>
        <EuiEmptyPrompt
          iconType="visArea"
          title={<h4>{error ? errorTitle : noHistoryDataTitle}</h4>}
          actions={
            <EuiButton color="primary" fill onClick={reload}>
              {error ? retryButtonLabel : checkNewDataButtonLabel}
            </EuiButton>
          }
        />
      </TimelineContainer>
    );
  }

  return (
    <TimelineContainer>
      <TimelineHeader>
        <EuiText>
          <strong>
            <FormattedMessage
              id="xpack.infra.inventoryTimeline.header"
              defaultMessage="Average {metricLabel}"
              values={{ metricLabel }}
            />
          </strong>
        </EuiText>
      </TimelineHeader>
      <TimelineChartContainer>
        <Chart>
          <MetricExplorerSeriesChart
            type={MetricsExplorerChartType.area}
            metric={chartMetric}
            id="0"
            series={timeseries!}
            stack={false}
          />
          <Axis
            id={'timestamp'}
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={dateFormatter}
          />
          <Axis
            id={'values'}
            position={Position.Left}
            tickFormat={yAxisFormatter}
            domain={domain}
            ticks={6}
            showGridLines
          />
          <Settings
            tooltip={tooltipProps}
            theme={getTimelineChartTheme(isDarkMode)}
            onElementClick={onClickPoint}
          />
        </Chart>
      </TimelineChartContainer>
    </TimelineContainer>
  );
};

const TimelineContainer = euiStyled.div`
  background-color: ${(props) => props.theme.eui.euiPageBackgroundColor};
  border-top: 1px solid ${(props) => props.theme.eui.euiColorLightShade};
  height: 220px;
  width: 100%;
  padding: ${(props) => props.theme.eui.paddingSizes.s} ${(props) =>
  props.theme.eui.paddingSizes.m};
  display: flex;
  flex-direction: column;
`;

const TimelineHeader = euiStyled.div`
  display: flex;
  width: 100%;
  padding: ${(props) => props.theme.eui.paddingSizes.s} ${(props) =>
  props.theme.eui.paddingSizes.m};
`;

const TimelineChartContainer = euiStyled.div`
  padding-left: ${(props) => props.theme.eui.paddingSizes.xs}; 
  width: 100%;
  height: 100%;
`;

const TimelineLoadingContainer = euiStyled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
`;

const noHistoryDataTitle = i18n.translate('xpack.infra.inventoryTimeline.noHistoryDataTitle', {
  defaultMessage: 'There is no history data to display.',
});

const errorTitle = i18n.translate('xpack.infra.inventoryTimeline.errorTitle', {
  defaultMessage: 'Unable to display history data.',
});

const checkNewDataButtonLabel = i18n.translate(
  'xpack.infra.inventoryTimeline.checkNewDataButtonLabel',
  {
    defaultMessage: 'Check for new data',
  }
);

const retryButtonLabel = i18n.translate('xpack.infra.inventoryTimeline.retryButtonLabel', {
  defaultMessage: 'Try again',
});
