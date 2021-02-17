/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback } from 'react';
import {
  Axis,
  Chart,
  niceTimeFormatter,
  Position,
  Settings,
  TooltipValue,
  RectAnnotation,
  AnnotationDomainTypes,
  LineAnnotation,
} from '@elastic/charts';
import { first, last } from 'lodash';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  Comparator,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../server/lib/alerting/metric_threshold/types';
import { Color, colorTransformer } from '../../../../common/color_palette';
import { MetricsExplorerRow, MetricsExplorerAggregation } from '../../../../common/http_api';
import { MetricExplorerSeriesChart } from '../../../pages/metrics/metrics_explorer/components/series_chart';
import { MetricsExplorerChartType } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { getChartTheme } from '../../../pages/metrics/metrics_explorer/components/helpers/get_chart_theme';
import { calculateDomain } from '../../../pages/metrics/metrics_explorer/components/helpers/calculate_domain';
import { getMetricId } from '../../../pages/metrics/metrics_explorer/components/helpers/get_metric_id';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { InventoryMetricConditions } from '../../../../server/lib/alerting/inventory_metric_threshold/types';
import { useSnapshot } from '../../../pages/metrics/inventory_view/hooks/use_snaphot';
import { InventoryItemType, SnapshotMetricType } from '../../../../common/inventory_models/types';
import { createInventoryMetricFormatter } from '../../../pages/metrics/inventory_view/lib/create_inventory_metric_formatter';
import { METRIC_FORMATTERS } from '../../../../common/formatters/snapshot_metric_formats';
import { InfraFormatterType } from '../../../lib/lib';

interface Props {
  expression: InventoryMetricConditions;
  filterQuery?: string;
  nodeType: InventoryItemType;
  sourceId: string;
}

const tooltipProps = {
  headerFormatter: (tooltipValue: TooltipValue) =>
    moment(tooltipValue.value).format('Y-MM-DD HH:mm:ss.SSS'),
};

const TIME_LABELS = {
  s: i18n.translate('xpack.infra.metrics.alerts.timeLabels.seconds', { defaultMessage: 'seconds' }),
  m: i18n.translate('xpack.infra.metrics.alerts.timeLabels.minutes', { defaultMessage: 'minutes' }),
  h: i18n.translate('xpack.infra.metrics.alerts.timeLabels.hours', { defaultMessage: 'hours' }),
  d: i18n.translate('xpack.infra.metrics.alerts.timeLabels.days', { defaultMessage: 'days' }),
};

export const ExpressionChart: React.FC<Props> = ({
  expression,
  filterQuery,
  nodeType,
  sourceId,
}) => {
  const timerange = useMemo(
    () => ({
      interval: `${expression.timeSize || 1}${expression.timeUnit}`,
      from: moment()
        .subtract((expression.timeSize || 1) * 20, expression.timeUnit)
        .valueOf(),
      to: moment().valueOf(),
      forceInterval: true,
      ignoreLookback: true,
    }),
    [expression.timeSize, expression.timeUnit]
  );

  const buildCustomMetric = (metric: any) => ({
    ...metric,
    type: 'custom' as SnapshotMetricType,
  });

  const { loading, nodes } = useSnapshot(
    filterQuery,
    expression.metric === 'custom'
      ? [buildCustomMetric(expression.customMetric)]
      : [{ type: expression.metric }],
    [],
    nodeType,
    sourceId,
    0,
    '',
    '',
    true,
    timerange
  );

  const { uiSettings } = useKibanaContextForPlugin().services;

  const metric = {
    field: expression.metric,
    aggregation: 'avg' as MetricsExplorerAggregation,
    color: Color.color0,
  };
  const isDarkMode = uiSettings?.get('theme:darkMode') || false;
  const dateFormatter = useMemo(() => {
    const firstSeries = nodes[0]?.metrics[0]?.timeseries;
    const firstTimestamp = first(firstSeries?.rows)?.timestamp;
    const lastTimestamp = last(firstSeries?.rows)?.timestamp;

    if (firstTimestamp == null || lastTimestamp == null) {
      return (value: number) => `${value}`;
    }

    return niceTimeFormatter([firstTimestamp, lastTimestamp]);
  }, [nodes]);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const yAxisFormater = useCallback(
    createInventoryMetricFormatter(
      expression.metric === 'custom'
        ? buildCustomMetric(expression.customMetric)
        : { type: expression.metric }
    ),
    [expression.metric]
  );

  if (loading || !nodes) {
    return (
      <EmptyContainer>
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.infra.metrics.alerts.loadingMessage"
            defaultMessage="Loading"
          />
        </EuiText>
      </EmptyContainer>
    );
  }

  const thresholds = expression.threshold.slice().sort();

  // Creating a custom series where the ID is changed to 0
  // so that we can get a proper domian
  const firstSeries = nodes[0]?.metrics[0]?.timeseries;
  if (!firstSeries || !firstSeries.rows || firstSeries.rows.length === 0) {
    return (
      <EmptyContainer>
        <EuiText color="subdued" data-test-subj="noChartData">
          <FormattedMessage
            id="xpack.infra.metrics.alerts.noDataMessage"
            defaultMessage="Oops, no chart data available"
          />
        </EuiText>
      </EmptyContainer>
    );
  }

  const thresholdFormatter = (value: number | undefined) => {
    const metricFormatter = METRIC_FORMATTERS[expression.metric];

    if (!value || !metricFormatter) {
      return value;
    }

    switch (metricFormatter.formatter) {
      case InfraFormatterType.percent:
        return value / 100;
      case InfraFormatterType.bits:
        return value / 1000;
      default:
        return value;
    }
  };

  const series = {
    ...firstSeries,
    rows: firstSeries.rows.map((row) => {
      const newRow: MetricsExplorerRow = { ...row };
      thresholds.forEach((thresholdValue, index) => {
        newRow[getMetricId(metric, `threshold_${index}`)] = thresholdFormatter(thresholdValue);
      });
      return newRow;
    }),
  };

  const firstTimestamp = first(firstSeries.rows)!.timestamp;
  const lastTimestamp = last(firstSeries.rows)!.timestamp;
  const dataDomain = calculateDomain(series, [metric], false);
  const domain = {
    max: Math.max(dataDomain.max, thresholdFormatter(last(thresholds)) || dataDomain.max) * 1.1, // add 10% headroom.
    min: Math.min(dataDomain.min, thresholdFormatter(first(thresholds)) || dataDomain.min),
  };

  if (domain.min === thresholdFormatter(first(expression.threshold))) {
    domain.min = domain.min * 0.9;
  }

  const isAbove = [Comparator.GT, Comparator.GT_OR_EQ].includes(expression.comparator);
  const isBelow = [Comparator.LT, Comparator.LT_OR_EQ].includes(expression.comparator);
  const opacity = 0.3;
  const { timeSize, timeUnit } = expression;
  const timeLabel = TIME_LABELS[timeUnit as keyof typeof TIME_LABELS];

  return (
    <>
      <ChartContainer>
        <Chart>
          <MetricExplorerSeriesChart
            type={MetricsExplorerChartType.bar}
            metric={metric}
            id="0"
            series={series}
            stack={false}
          />
          <LineAnnotation
            id={`thresholds`}
            domainType={AnnotationDomainTypes.YDomain}
            dataValues={thresholds.map((threshold) => ({
              dataValue: thresholdFormatter(threshold),
            }))}
            style={{
              line: {
                strokeWidth: 2,
                stroke: colorTransformer(Color.color1),
                opacity: 1,
              },
            }}
          />
          {thresholds.length === 2 && expression.comparator === Comparator.BETWEEN ? (
            <>
              <RectAnnotation
                id="lower-threshold"
                style={{
                  fill: colorTransformer(Color.color1),
                  opacity,
                }}
                dataValues={[
                  {
                    coordinates: {
                      x0: firstTimestamp,
                      x1: lastTimestamp,
                      y0: thresholdFormatter(first(expression.threshold)),
                      y1: thresholdFormatter(last(expression.threshold)),
                    },
                  },
                ]}
              />
            </>
          ) : null}
          {thresholds.length === 2 && expression.comparator === Comparator.OUTSIDE_RANGE ? (
            <>
              <RectAnnotation
                id="lower-threshold"
                style={{
                  fill: colorTransformer(Color.color1),
                  opacity,
                }}
                dataValues={[
                  {
                    coordinates: {
                      x0: firstTimestamp,
                      x1: lastTimestamp,
                      y0: domain.min,
                      y1: thresholdFormatter(first(expression.threshold)),
                    },
                  },
                ]}
              />
              <RectAnnotation
                id="upper-threshold"
                style={{
                  fill: colorTransformer(Color.color1),
                  opacity,
                }}
                dataValues={[
                  {
                    coordinates: {
                      x0: firstTimestamp,
                      x1: lastTimestamp,
                      y0: thresholdFormatter(last(expression.threshold)),
                      y1: domain.max,
                    },
                  },
                ]}
              />
            </>
          ) : null}
          {isBelow && first(expression.threshold) != null ? (
            <RectAnnotation
              id="upper-threshold"
              style={{
                fill: colorTransformer(Color.color1),
                opacity,
              }}
              dataValues={[
                {
                  coordinates: {
                    x0: firstTimestamp,
                    x1: lastTimestamp,
                    y0: domain.min,
                    y1: thresholdFormatter(first(expression.threshold)),
                  },
                },
              ]}
            />
          ) : null}
          {isAbove && first(expression.threshold) != null ? (
            <RectAnnotation
              id="upper-threshold"
              style={{
                fill: colorTransformer(Color.color1),
                opacity,
              }}
              dataValues={[
                {
                  coordinates: {
                    x0: firstTimestamp,
                    x1: lastTimestamp,
                    y0: thresholdFormatter(first(expression.threshold)),
                    y1: domain.max,
                  },
                },
              ]}
            />
          ) : null}
          <Axis
            id={'timestamp'}
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={dateFormatter}
          />
          <Axis id={'values'} position={Position.Left} tickFormat={yAxisFormater} domain={domain} />
          <Settings tooltip={tooltipProps} theme={getChartTheme(isDarkMode)} />
        </Chart>
      </ChartContainer>
      <div style={{ textAlign: 'center' }}>
        {series.id !== 'ALL' ? (
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.infra.metrics.alerts.dataTimeRangeLabelWithGrouping"
              defaultMessage="Last {lookback} {timeLabel} of data for {id}"
              values={{ id: series.id, timeLabel, lookback: timeSize * 20 }}
            />
          </EuiText>
        ) : (
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.infra.metrics.alerts.dataTimeRangeLabel"
              defaultMessage="Last {lookback} {timeLabel}"
              values={{ timeLabel, lookback: timeSize * 20 }}
            />
          </EuiText>
        )}
      </div>
    </>
  );
};

const EmptyContainer: React.FC = ({ children }) => (
  <div
    style={{
      width: '100%',
      height: 150,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    {children}
  </div>
);

const ChartContainer: React.FC = ({ children }) => (
  <div
    style={{
      width: '100%',
      height: 150,
    }}
  >
    {children}
  </div>
);
