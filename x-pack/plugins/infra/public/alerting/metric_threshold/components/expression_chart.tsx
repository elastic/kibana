/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
} from '@elastic/charts';
import { first, last } from 'lodash';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { IIndexPattern } from 'src/plugins/data/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AlertsContextValue } from '../../../../../triggers_actions_ui/public/application/context/alerts_context';
import { InfraSource } from '../../../../common/http_api/source_api';
import {
  Comparator,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../server/lib/alerting/metric_threshold/types';
import { MetricsExplorerColor, colorTransformer } from '../../../../common/color_palette';
import { MetricsExplorerRow, MetricsExplorerAggregation } from '../../../../common/http_api';
import { MetricExplorerSeriesChart } from '../../../pages/metrics/metrics_explorer/components/series_chart';
import { MetricExpression, AlertContextMeta } from '../types';
import { MetricsExplorerChartType } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { getChartTheme } from '../../../pages/metrics/metrics_explorer/components/helpers/get_chart_theme';
import { createFormatterForMetric } from '../../../pages/metrics/metrics_explorer/components/helpers/create_formatter_for_metric';
import { calculateDomain } from '../../../pages/metrics/metrics_explorer/components/helpers/calculate_domain';
import { useMetricsExplorerChartData } from '../hooks/use_metrics_explorer_chart_data';

interface Props {
  context: AlertsContextValue<AlertContextMeta>;
  expression: MetricExpression;
  derivedIndexPattern: IIndexPattern;
  source: InfraSource | null;
  filterQuery?: string;
  groupBy?: string;
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
  context,
  derivedIndexPattern,
  source,
  filterQuery,
  groupBy,
}) => {
  const { loading, data } = useMetricsExplorerChartData(
    expression,
    context,
    derivedIndexPattern,
    source,
    filterQuery,
    groupBy
  );

  const metric = {
    field: expression.metric,
    aggregation: expression.aggType as MetricsExplorerAggregation,
    color: MetricsExplorerColor.color0,
  };
  const isDarkMode = context.uiSettings?.get('theme:darkMode') || false;
  const dateFormatter = useMemo(() => {
    const firstSeries = data ? first(data.series) : null;
    return firstSeries && firstSeries.rows.length > 0
      ? niceTimeFormatter([first(firstSeries.rows).timestamp, last(firstSeries.rows).timestamp])
      : (value: number) => `${value}`;
  }, [data]);

  const yAxisFormater = useCallback(createFormatterForMetric(metric), [expression]);

  if (loading || !data) {
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
  const firstSeries = first(data.series);
  if (!firstSeries) {
    return (
      <EmptyContainer>
        <EuiText color="subdued">Oops, no chart data available</EuiText>
      </EmptyContainer>
    );
  }

  const series = {
    ...firstSeries,
    rows: firstSeries.rows.map(row => {
      const newRow: MetricsExplorerRow = {
        timestamp: row.timestamp,
        metric_0: row.metric_0 || null,
      };
      thresholds.forEach((thresholdValue, index) => {
        newRow[`metric_threshold_${index}`] = thresholdValue;
      });
      return newRow;
    }),
  };

  const firstTimestamp = first(firstSeries.rows).timestamp;
  const lastTimestamp = last(firstSeries.rows).timestamp;
  const dataDomain = calculateDomain(series, [metric], false);
  const domain = {
    max: Math.max(dataDomain.max, last(thresholds) || dataDomain.max) * 1.1, // add 10% headroom.
    min: Math.min(dataDomain.min, first(thresholds) || dataDomain.min),
  };

  if (domain.min === first(expression.threshold)) {
    domain.min = domain.min * 0.9;
  }

  const isAbove = [Comparator.GT, Comparator.GT_OR_EQ].includes(expression.comparator);
  const opacity = 0.3;
  const timeLabel = TIME_LABELS[expression.timeUnit];

  return (
    <>
      <ChartContainer>
        <Chart>
          <MetricExplorerSeriesChart
            type={MetricsExplorerChartType.area}
            metric={metric}
            id="0"
            series={series}
            stack={false}
          />
          {thresholds.length ? (
            <MetricExplorerSeriesChart
              type={isAbove ? MetricsExplorerChartType.line : MetricsExplorerChartType.area}
              metric={{
                ...metric,
                color: MetricsExplorerColor.color1,
                label: i18n.translate('xpack.infra.metrics.alerts.thresholdLabel', {
                  defaultMessage: 'Threshold',
                }),
              }}
              id={thresholds.map((t, i) => `threshold_${i}`)}
              series={series}
              stack={false}
              opacity={opacity}
            />
          ) : null}
          {thresholds.length && expression.comparator === Comparator.OUTSIDE_RANGE ? (
            <>
              <MetricExplorerSeriesChart
                type={MetricsExplorerChartType.line}
                metric={{
                  ...metric,
                  color: MetricsExplorerColor.color1,
                  label: i18n.translate('xpack.infra.metrics.alerts.thresholdLabel', {
                    defaultMessage: 'Threshold',
                  }),
                }}
                id={thresholds.map((t, i) => `threshold_${i}`)}
                series={series}
                stack={false}
                opacity={opacity}
              />
              <RectAnnotation
                id="lower-threshold"
                style={{
                  fill: colorTransformer(MetricsExplorerColor.color1),
                  opacity,
                }}
                dataValues={[
                  {
                    coordinates: {
                      x0: firstTimestamp,
                      x1: lastTimestamp,
                      y0: domain.min,
                      y1: first(expression.threshold),
                    },
                  },
                ]}
              />
              <RectAnnotation
                id="upper-threshold"
                style={{
                  fill: colorTransformer(MetricsExplorerColor.color1),
                  opacity,
                }}
                dataValues={[
                  {
                    coordinates: {
                      x0: firstTimestamp,
                      x1: lastTimestamp,
                      y0: last(expression.threshold),
                      y1: domain.max,
                    },
                  },
                ]}
              />
            </>
          ) : null}
          {isAbove ? (
            <RectAnnotation
              id="upper-threshold"
              style={{
                fill: colorTransformer(MetricsExplorerColor.color1),
                opacity,
              }}
              dataValues={[
                {
                  coordinates: {
                    x0: firstTimestamp,
                    x1: lastTimestamp,
                    y0: first(expression.threshold),
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
              defaultMessage="Last 20 {timeLabel} of data for {id}"
              values={{ id: series.id, timeLabel }}
            />
          </EuiText>
        ) : (
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.infra.metrics.alerts.dataTimeRangeLabel"
              defaultMessage="Last 20 {timeLabel}"
              values={{ timeLabel }}
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
