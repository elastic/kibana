/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback } from 'react';
import { Axis, Chart, niceTimeFormatter, Position, Settings } from '@elastic/charts';
import { first, last } from 'lodash';
import moment from 'moment';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Color } from '../../../../common/color_palette';
import { MetricsExplorerRow, MetricsExplorerAggregation } from '../../../../common/http_api';
import { MetricExplorerSeriesChart } from '../../../pages/metrics/metrics_explorer/components/series_chart';
import { MetricsExplorerChartType } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { calculateDomain } from '../../../pages/metrics/metrics_explorer/components/helpers/calculate_domain';
import { getMetricId } from '../../../pages/metrics/metrics_explorer/components/helpers/get_metric_id';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { InventoryMetricConditions } from '../../../../server/lib/alerting/inventory_metric_threshold/types';
import { useSnapshot } from '../../../pages/metrics/inventory_view/hooks/use_snaphot';
import { InventoryItemType, SnapshotMetricType } from '../../../../common/inventory_models/types';
import { createInventoryMetricFormatter } from '../../../pages/metrics/inventory_view/lib/create_inventory_metric_formatter';

import {
  ChartContainer,
  LoadingState,
  NoDataState,
  TIME_LABELS,
  tooltipProps,
  getChartTheme,
} from '../../common/criterion_preview_chart/criterion_preview_chart';
import { ThresholdAnnotations } from '../../common/criterion_preview_chart/threshold_annotations';
import { useWaffleOptionsContext } from '../../../pages/metrics/inventory_view/hooks/use_waffle_options';

interface Props {
  expression: InventoryMetricConditions;
  filterQuery?: string;
  nodeType: InventoryItemType;
  sourceId: string;
}

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

  const options = useWaffleOptionsContext();
  const { loading, nodes } = useSnapshot(
    filterQuery,
    expression.metric === 'custom'
      ? [buildCustomMetric(expression.customMetric)]
      : [{ type: expression.metric }],
    [],
    nodeType,
    sourceId,
    0,
    options.accountId,
    options.region,
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
    return <LoadingState />;
  }

  const convertThreshold = (threshold: number) => convertMetricValue(expression.metric, threshold);
  const convertedThresholds = expression.threshold.map(convertThreshold);
  const convertedWarningThresholds = expression.warningThreshold?.map(convertThreshold) ?? [];

  const criticalThresholds = convertedThresholds.slice().sort();
  const warningThresholds = convertedWarningThresholds.slice().sort();
  const thresholds = [...criticalThresholds, ...warningThresholds].sort();

  // Creating a custom series where the ID is changed to 0
  // so that we can get a proper domian
  const firstSeries = nodes[0]?.metrics[0]?.timeseries;
  if (!firstSeries || !firstSeries.rows || firstSeries.rows.length === 0) {
    return <NoDataState />;
  }

  const series = {
    ...firstSeries,
    id: nodes[0]?.name,
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
    min: Math.min(dataDomain.min, first(thresholds) || dataDomain.min) * 0.9, // add 10% floor
  };

  if (domain.min === first(convertedThresholds)) {
    domain.min = domain.min * 0.9;
  }

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
          <ThresholdAnnotations
            comparator={expression.comparator}
            threshold={convertedThresholds}
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
              threshold={convertedWarningThresholds}
              sortedThresholds={warningThresholds}
              color={Color.color5}
              id="warning"
              firstTimestamp={firstTimestamp}
              lastTimestamp={lastTimestamp}
              domain={domain}
            />
          )}
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

const convertMetricValue = (metric: SnapshotMetricType, value: number) => {
  if (converters[metric]) {
    return converters[metric](value);
  } else {
    return value;
  }
};
const converters: Record<string, (n: number) => number> = {
  cpu: (n) => Number(n) / 100,
  memory: (n) => Number(n) / 100,
};
