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
  AnnotationDomainTypes,
  LineAnnotation,
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
import { Color, colorTransformer } from '../../../../common/color_palette';
import { MetricsExplorerRow, MetricsExplorerAggregation } from '../../../../common/http_api';
import { MetricExplorerSeriesChart } from '../../../pages/metrics/metrics_explorer/components/series_chart';
import { MetricExpression, AlertContextMeta } from '../types';
import { MetricsExplorerChartType } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { getChartTheme } from '../../../pages/metrics/metrics_explorer/components/helpers/get_chart_theme';
import { createFormatterForMetric } from '../../../pages/metrics/metrics_explorer/components/helpers/create_formatter_for_metric';
import { calculateDomain } from '../../../pages/metrics/metrics_explorer/components/helpers/calculate_domain';
import { useMetricsExplorerChartData } from '../hooks/use_metrics_explorer_chart_data';
import { getMetricId } from '../../../pages/metrics/metrics_explorer/components/helpers/get_metric_id';

interface Props {
  context: AlertsContextValue<AlertContextMeta>;
  expression: MetricExpression;
  derivedIndexPattern: IIndexPattern;
  source: InfraSource | null;
  filterQuery?: string;
  groupBy?: string | string[];
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
    color: Color.color0,
  };
  const isDarkMode = context.uiSettings?.get('theme:darkMode') || false;
  const dateFormatter = useMemo(() => {
    const firstSeries = first(data?.series);
    const firstTimestamp = first(firstSeries?.rows)?.timestamp;
    const lastTimestamp = last(firstSeries?.rows)?.timestamp;

    if (firstTimestamp == null || lastTimestamp == null) {
      return (value: number) => `${value}`;
    }

    return niceTimeFormatter([firstTimestamp, lastTimestamp]);
  }, [data?.series]);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
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

  const series = {
    ...firstSeries,
    rows: firstSeries.rows.map((row) => {
      const newRow: MetricsExplorerRow = { ...row };
      thresholds.forEach((thresholdValue, index) => {
        newRow[getMetricId(metric, `threshold_${index}`)] = thresholdValue;
      });
      return newRow;
    }),
  };

  const firstTimestamp = first(firstSeries.rows)!.timestamp;
  const lastTimestamp = last(firstSeries.rows)!.timestamp;
  const dataDomain = calculateDomain(series, [metric], false);
  const domain = {
    max: Math.max(dataDomain.max, last(thresholds) || dataDomain.max) * 1.1, // add 10% headroom.
    min: Math.min(dataDomain.min, first(thresholds) || dataDomain.min),
  };

  if (domain.min === first(expression.threshold)) {
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
              dataValue: threshold,
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
                      y0: first(expression.threshold),
                      y1: last(expression.threshold),
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
                      y1: first(expression.threshold),
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
                      y0: last(expression.threshold),
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
                    y1: first(expression.threshold),
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
