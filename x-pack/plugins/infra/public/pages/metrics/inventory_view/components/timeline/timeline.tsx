/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
  GeometryValue,
  RectAnnotation,
  RectAnnotationDatum,
} from '@elastic/charts';
import { EuiFlexItem } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { useUiSetting } from '../../../../../../../../../src/plugins/kibana_react/public';
import { toMetricOpt } from '../../../../../../common/snapshot_metric_i18n';
import { MetricsExplorerAggregation } from '../../../../../../common/http_api';
import { colorTransformer, Color } from '../../../../../../common/color_palette';
import { useSourceContext } from '../../../../../containers/metrics_source';
import { useTimeline } from '../../hooks/use_timeline';
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
import { useWaffleTimeContext } from '../../hooks/use_waffle_time';
import { useWaffleFiltersContext } from '../../hooks/use_waffle_filters';
import { MetricExplorerSeriesChart } from '../../../metrics_explorer/components/series_chart';
import { MetricsExplorerChartType } from '../../../metrics_explorer/hooks/use_metrics_explorer_options';
import { getTimelineChartTheme } from '../../../metrics_explorer/components/helpers/get_chart_theme';
import { calculateDomain } from '../../../metrics_explorer/components/helpers/calculate_domain';

import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { InfraFormatter } from '../../../../../lib/lib';
import { useMetricsHostsAnomaliesResults } from '../../hooks/use_metrics_hosts_anomalies';
import { useMetricsK8sAnomaliesResults } from '../../hooks/use_metrics_k8s_anomalies';

interface Props {
  interval: string;
  yAxisFormatter: InfraFormatter;
  isVisible: boolean;
}

export const Timeline: React.FC<Props> = ({ interval, yAxisFormatter, isVisible }) => {
  const { sourceId, source } = useSourceContext();
  const { metric, nodeType, accountId, region } = useWaffleOptionsContext();
  const { currentTime, jumpToTime, stopAutoReload } = useWaffleTimeContext();
  const { filterQueryAsJson } = useWaffleFiltersContext();

  const { loading, error, startTime, endTime, timeseries, reload } = useTimeline(
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

  const anomalyParams = {
    sourceId: 'default',
    anomalyThreshold: source?.configuration.anomalyThreshold || 0,
    startTime,
    endTime,
    defaultSortOptions: {
      direction: 'desc' as const,
      field: 'anomalyScore' as const,
    },
    defaultPaginationOptions: { pageSize: 100 },
  };

  const { metricsHostsAnomalies, getMetricsHostsAnomalies } =
    useMetricsHostsAnomaliesResults(anomalyParams);
  const { metricsK8sAnomalies, getMetricsK8sAnomalies } =
    useMetricsK8sAnomaliesResults(anomalyParams);

  const getAnomalies = useMemo(() => {
    if (nodeType === 'host') {
      return getMetricsHostsAnomalies;
    } else if (nodeType === 'pod') {
      return getMetricsK8sAnomalies;
    }
  }, [nodeType, getMetricsK8sAnomalies, getMetricsHostsAnomalies]);

  const anomalies = useMemo(() => {
    if (nodeType === 'host') {
      return metricsHostsAnomalies;
    } else if (nodeType === 'pod') {
      return metricsK8sAnomalies;
    }
  }, [nodeType, metricsHostsAnomalies, metricsK8sAnomalies]);

  const metricLabel = toMetricOpt(metric.type)?.textLC;
  const metricPopoverLabel = toMetricOpt(metric.type)?.text;

  const chartMetric = {
    color: Color.color0,
    aggregation: 'avg' as MetricsExplorerAggregation,
    label: metricPopoverLabel,
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
        // casting to GeometryValue as we are using cartesian charts
        const { x: timestamp } = geometryValue as GeometryValue;
        jumpToTime(timestamp);
        stopAutoReload();
      }
    },
    [jumpToTime, stopAutoReload]
  );

  const anomalyMetricName = useMemo(() => {
    const metricType = metric.type;
    if (metricType === 'memory') {
      return 'memory_usage';
    }
    if (metricType === 'rx') {
      return 'network_in';
    }
    if (metricType === 'tx') {
      return 'network_out';
    }
  }, [metric]);

  useEffect(() => {
    if (getAnomalies && anomalyMetricName) {
      getAnomalies(anomalyMetricName);
    }
  }, [getAnomalies, anomalyMetricName]);

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

  function generateAnnotationData(results: Array<[number, string[]]>): RectAnnotationDatum[] {
    return results.map((anomaly) => {
      const [val, influencers] = anomaly;
      return {
        coordinates: {
          x0: val,
          x1: moment(val).add(15, 'minutes').valueOf(),
          y0: dataDomain?.min,
          y1: dataDomain?.max,
        },
        details: influencers.join(','),
      };
    });
  }

  return (
    <TimelineContainer
      data-test-subj={isVisible ? 'timelineContainerOpen' : 'timelineContainerClosed'}
    >
      <TimelineHeader>
        <EuiFlexItem grow={true}>
          <EuiText>
            <strong>
              <FormattedMessage
                id="xpack.infra.inventoryTimeline.header"
                defaultMessage="Average {metricLabel}"
                values={{ metricLabel }}
              />
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems={'center'} responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize={'s'} alignItems={'center'} responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon color={colorTransformer(chartMetric.color)} type={'dot'} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size={'xs'}>
                    <FormattedMessage
                      id="xpack.infra.inventoryTimeline.header"
                      defaultMessage="Average {metricLabel}"
                      values={{ metricLabel }}
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize={'s'} alignItems={'center'} responsive={false}>
                <EuiFlexItem
                  grow={false}
                  style={{ backgroundColor: '#D36086', height: 5, width: 10 }}
                />
                <EuiFlexItem>
                  <EuiText size={'xs'}>
                    <FormattedMessage
                      id="xpack.infra.inventoryTimeline.legend.anomalyLabel"
                      defaultMessage="Anomaly detected"
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </TimelineHeader>
      <TimelineChartContainer>
        <Chart>
          {anomalies && (
            <RectAnnotation
              id={'anomalies'}
              dataValues={generateAnnotationData(
                anomalies.map((a) => [a.startTime, a.influencers])
              )}
              style={{ fill: '#D36086' }}
            />
          )}
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
  @media only screen and (max-width: 767px) {
      margin-top: 30px;
  }
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
  defaultMessage: 'There is no historical data to display.',
});

const errorTitle = i18n.translate('xpack.infra.inventoryTimeline.errorTitle', {
  defaultMessage: 'Unable to show historical data.',
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
