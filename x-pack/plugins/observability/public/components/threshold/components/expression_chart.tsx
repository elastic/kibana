/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement, useRef } from 'react';
import {
  Axis,
  Chart,
  LineAnnotation,
  niceTimeFormatter,
  Position,
  RectAnnotation,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useActiveCursor } from '@kbn/charts-plugin/public';
import { DataViewBase } from '@kbn/es-query';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { first, last } from 'lodash';
import moment from 'moment';
import { useKibana } from '../../../utils/kibana_react';
import {
  MetricsExplorerAggregation,
  MetricsExplorerRow,
} from '../../../../common/threshold_rule/metrics_explorer';
import { Color } from '../../../../common/threshold_rule/color_palette';
import {
  MetricsExplorerChartType,
  MetricsExplorerOptionsMetric,
} from '../../../../common/threshold_rule/types';
import { MetricExpression, TimeRange } from '../types';
import { createFormatterForMetric } from '../helpers/create_formatter_for_metric';
import { useMetricsExplorerChartData } from '../hooks/use_metrics_explorer_chart_data';
import {
  ChartContainer,
  LoadingState,
  NoDataState,
  TIME_LABELS,
  getChartTheme,
} from './criterion_preview_chart/criterion_preview_chart';
import { ThresholdAnnotations } from './criterion_preview_chart/threshold_annotations';
import { CUSTOM_EQUATION } from '../i18n_strings';
import { calculateDomain } from '../helpers/calculate_domain';
import { getMetricId } from '../helpers/get_metric_id';
import { MetricExplorerSeriesChart } from './series_chart';

interface Props {
  expression: MetricExpression;
  derivedIndexPattern: DataViewBase;
  annotations?: Array<ReactElement<typeof RectAnnotation | typeof LineAnnotation>>;
  chartType?: MetricsExplorerChartType;
  filterQuery?: string;
  groupBy?: string | string[];
  hideTitle?: boolean;
  timeRange?: TimeRange;
  timeFieldName?: string;
}

export function ExpressionChart({
  expression,
  derivedIndexPattern,
  annotations,
  chartType = MetricsExplorerChartType.bar,
  filterQuery,
  groupBy,
  hideTitle = false,
  timeRange,
  timeFieldName,
}: Props) {
  const { charts, uiSettings } = useKibana().services;
  const { isLoading, data } = useMetricsExplorerChartData(
    expression,
    derivedIndexPattern,
    filterQuery,
    groupBy,
    timeRange,
    timeFieldName
  );

  const chartRef = useRef(null);
  const handleCursorUpdate = useActiveCursor(charts.activeCursor, chartRef, {
    isDateHistogram: true,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (!data) {
    return <NoDataState />;
  }

  const isDarkMode = uiSettings?.get('theme:darkMode') || false;
  const firstSeries = first(first(data.pages)!.series);
  // Creating a custom series where the ID is changed to 0
  // so that we can get a proper domain
  if (!firstSeries || !firstSeries.rows || firstSeries.rows.length === 0) {
    return <NoDataState />;
  }

  const firstTimestamp = first(firstSeries.rows)!.timestamp;
  const lastTimestamp = last(firstSeries.rows)!.timestamp;
  const metric: MetricsExplorerOptionsMetric = {
    field: expression.metric,
    aggregation: expression.aggType as MetricsExplorerAggregation,
    color: Color.color0,
  };

  if (metric.aggregation === 'custom') {
    metric.label = expression.label || CUSTOM_EQUATION;
  }

  const dateFormatter =
    firstTimestamp == null || lastTimestamp == null
      ? (value: number) => `${value}`
      : niceTimeFormatter([firstTimestamp, lastTimestamp]);

  const criticalThresholds = expression.threshold.slice().sort();
  const warningThresholds = expression.warningThreshold?.slice().sort() ?? [];
  const thresholds = [...criticalThresholds, ...warningThresholds].sort();

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

  const dataDomain = calculateDomain(series, [metric], false);
  const domain = {
    max: Math.max(dataDomain.max, last(thresholds) || dataDomain.max) * 1.1,
    min: Math.min(dataDomain.min, first(thresholds) || dataDomain.min) * 0.9, // add 10% floor,
  };

  if (domain.min === first(expression.threshold)) {
    domain.min = domain.min * 0.9;
  }

  const { timeSize, timeUnit } = expression;
  const timeLabel = TIME_LABELS[timeUnit as keyof typeof TIME_LABELS];

  return (
    <>
      <ChartContainer>
        <Chart ref={chartRef}>
          <MetricExplorerSeriesChart
            type={chartType}
            metric={metric}
            id="0"
            series={series}
            stack={false}
          />
          <ThresholdAnnotations
            comparator={expression.comparator}
            threshold={expression.threshold}
            sortedThresholds={criticalThresholds}
            color={Color.color1}
            id="critical"
            firstTimestamp={firstTimestamp}
            lastTimestamp={lastTimestamp}
            domain={domain}
          />
          {expression.warningComparator && expression.warningThreshold && (
            <ThresholdAnnotations
              comparator={expression.warningComparator}
              threshold={expression.warningThreshold}
              sortedThresholds={warningThresholds}
              color={Color.color5}
              id="warning"
              firstTimestamp={firstTimestamp}
              lastTimestamp={lastTimestamp}
              domain={domain}
            />
          )}
          {annotations}
          <Axis
            id={'timestamp'}
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={dateFormatter}
          />
          <Axis
            id={'values'}
            position={Position.Left}
            tickFormat={createFormatterForMetric(metric)}
            domain={domain}
          />
          <Tooltip
            headerFormatter={({ value }) =>
              moment(value).format(uiSettings.get(UI_SETTINGS.DATE_FORMAT))
            }
          />
          <Settings
            onPointerUpdate={handleCursorUpdate}
            externalPointerEvents={{
              tooltip: { visible: true },
            }}
            theme={getChartTheme(isDarkMode)}
          />
        </Chart>
      </ChartContainer>
      {!hideTitle && (
        <div style={{ textAlign: 'center' }}>
          {series.id !== 'ALL' ? (
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.observability.threshold.rule.alerts.dataTimeRangeLabelWithGrouping"
                defaultMessage="Last {lookback} {timeLabel} of data for {id}"
                values={{ id: series.id, timeLabel, lookback: timeSize! * 20 }}
              />
            </EuiText>
          ) : (
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.observability.threshold.rule.alerts.dataTimeRangeLabel"
                defaultMessage="Last {lookback} {timeLabel}"
                values={{ timeLabel, lookback: timeSize! * 20 }}
              />
            </EuiText>
          )}
        </div>
      )}
    </>
  );
}
