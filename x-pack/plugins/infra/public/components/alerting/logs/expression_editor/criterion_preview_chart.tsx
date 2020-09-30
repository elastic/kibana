/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { useDebounce } from 'react-use';
import {
  ScaleType,
  AnnotationDomainTypes,
  Position,
  Axis,
  BarSeries,
  Chart,
  Settings,
  RectAnnotation,
  LineAnnotation,
} from '@elastic/charts';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  ChartContainer,
  LoadingState,
  NoDataState,
  ErrorState,
  TIME_LABELS,
  getDomain,
  tooltipProps,
  useDateFormatter,
  getChartTheme,
  yAxisFormatter,
  NUM_BUCKETS,
} from '../../shared/criterion_preview_chart/criterion_preview_chart';
import {
  LogDocumentCountAlertParams,
  Criterion,
  Comparator,
} from '../../../../../common/alerting/logs/types';
import { Color, colorTransformer } from '../../../../../common/color_palette';
import {
  GetLogAlertsChartPreviewDataAlertParamsSubset,
  getLogAlertsChartPreviewDataAlertParamsSubsetRT,
} from '../../../../../common/http_api/log_alerts/';
import { AlertsContext } from './editor';
import { useChartPreviewData } from './hooks/use_chart_preview_data';
import { decodeOrThrow } from '../../../../../common/runtime_types';

const GROUP_LIMIT = 5;

interface Props {
  alertParams: Partial<LogDocumentCountAlertParams>;
  context: AlertsContext;
  chartCriterion: Partial<Criterion>;
  sourceId: string;
}

export const CriterionPreview: React.FC<Props> = ({
  alertParams,
  context,
  chartCriterion,
  sourceId,
}) => {
  const chartAlertParams: GetLogAlertsChartPreviewDataAlertParamsSubset | null = useMemo(() => {
    const { field, comparator, value } = chartCriterion;
    const criteria = field && comparator && value ? [{ field, comparator, value }] : [];
    const params = {
      criteria,
      timeSize: alertParams.timeSize,
      timeUnit: alertParams.timeUnit,
      groupBy: alertParams.groupBy,
    };

    try {
      return decodeOrThrow(getLogAlertsChartPreviewDataAlertParamsSubsetRT)(params);
    } catch (error) {
      return null;
    }
  }, [alertParams.timeSize, alertParams.timeUnit, alertParams.groupBy, chartCriterion]);

  // Check for the existence of properties that are necessary for a meaningful chart.
  if (chartAlertParams === null || chartAlertParams.criteria.length === 0) return null;

  return (
    <CriterionPreviewChart
      buckets={
        !chartAlertParams.groupBy || chartAlertParams.groupBy.length === 0
          ? NUM_BUCKETS
          : NUM_BUCKETS / 4
      } // Display less data for groups due to space limitations
      context={context}
      sourceId={sourceId}
      threshold={alertParams.count}
      chartAlertParams={chartAlertParams}
    />
  );
};

interface ChartProps {
  buckets: number;
  context: AlertsContext;
  sourceId: string;
  threshold?: LogDocumentCountAlertParams['count'];
  chartAlertParams: GetLogAlertsChartPreviewDataAlertParamsSubset;
}

const CriterionPreviewChart: React.FC<ChartProps> = ({
  buckets,
  context,
  sourceId,
  threshold,
  chartAlertParams,
}) => {
  const isDarkMode = context.uiSettings?.get('theme:darkMode') || false;

  const {
    getChartPreviewData,
    isLoading,
    hasError,
    chartPreviewData: series,
  } = useChartPreviewData({
    context,
    sourceId,
    alertParams: chartAlertParams,
    buckets,
  });

  useDebounce(
    () => {
      getChartPreviewData();
    },
    500,
    [getChartPreviewData]
  );

  const isStacked = false;

  const { timeSize, timeUnit, groupBy } = chartAlertParams;

  const isGrouped = groupBy && groupBy.length > 0 ? true : false;

  const isAbove =
    threshold && threshold.comparator
      ? [Comparator.GT, Comparator.GT_OR_EQ].includes(threshold.comparator)
      : false;

  const isBelow =
    threshold && threshold.comparator
      ? [Comparator.LT, Comparator.LT_OR_EQ].includes(threshold.comparator)
      : false;

  // For grouped scenarios we want to limit the groups displayed, for "isAbove" thresholds we'll show
  // groups with the highest doc counts. And for "isBelow" thresholds we'll show groups with the lowest doc counts.
  const filteredSeries = useMemo(() => {
    if (!isGrouped) {
      return series;
    }

    const sortedByMax = series.sort((a, b) => {
      const aMax = Math.max(...a.points.map((point) => point.value));
      const bMax = Math.max(...b.points.map((point) => point.value));
      return bMax - aMax;
    });
    const sortedSeries = (!isAbove && !isBelow) || isAbove ? sortedByMax : sortedByMax.reverse();
    return sortedSeries.slice(0, GROUP_LIMIT);
  }, [series, isGrouped, isAbove, isBelow]);

  const barSeries = useMemo(() => {
    return filteredSeries.reduce<Array<{ timestamp: number; value: number; groupBy: string }>>(
      (acc, serie) => {
        const barPoints = serie.points.reduce<
          Array<{ timestamp: number; value: number; groupBy: string }>
        >((pointAcc, point) => {
          return [...pointAcc, { ...point, groupBy: serie.id }];
        }, []);
        return [...acc, ...barPoints];
      },
      []
    );
  }, [filteredSeries]);

  const lookback = timeSize * buckets;
  const hasData = series.length > 0;
  const { yMin, yMax, xMin, xMax } = getDomain(filteredSeries, isStacked);
  const chartDomain = {
    max: threshold && threshold.value ? Math.max(yMax, threshold.value) * 1.1 : yMax * 1.1, // Add 10% headroom.
    min: threshold && threshold.value ? Math.min(yMin, threshold.value) : yMin,
  };

  if (threshold && threshold.value && chartDomain.min === threshold.value) {
    chartDomain.min = chartDomain.min * 0.9; // Allow some padding so the threshold annotation has better visibility
  }

  const THRESHOLD_OPACITY = 0.3;
  const groupByLabel = groupBy && groupBy.length > 0 ? groupBy.join(', ') : null;
  const dateFormatter = useDateFormatter(xMin, xMax);
  const timeLabel = TIME_LABELS[timeUnit as keyof typeof TIME_LABELS];

  if (isLoading) {
    return <LoadingState />;
  } else if (hasError) {
    return <ErrorState />;
  } else if (!hasData) {
    return <NoDataState />;
  }

  return (
    <>
      <ChartContainer>
        <Chart>
          <BarSeries
            id="criterion-preview"
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="timestamp"
            yAccessors={['value']}
            splitSeriesAccessors={['groupBy']}
            stackAccessors={isStacked ? ['timestamp'] : undefined}
            data={barSeries}
            barSeriesStyle={{
              rectBorder: {
                stroke: !isGrouped ? colorTransformer(Color.color0) : undefined,
                strokeWidth: 1,
                visible: true,
              },
              rect: {
                opacity: 1,
              },
            }}
            color={!isGrouped ? colorTransformer(Color.color0) : undefined}
          />
          {threshold && threshold.value ? (
            <LineAnnotation
              id={`threshold-line`}
              domainType={AnnotationDomainTypes.YDomain}
              dataValues={[{ dataValue: threshold.value }]}
              style={{
                line: {
                  strokeWidth: 2,
                  stroke: colorTransformer(Color.color1),
                  opacity: 1,
                },
              }}
            />
          ) : null}
          {threshold && threshold.value && isBelow ? (
            <RectAnnotation
              id="below-threshold"
              style={{
                fill: colorTransformer(Color.color1),
                opacity: THRESHOLD_OPACITY,
              }}
              dataValues={[
                {
                  coordinates: {
                    x0: xMin,
                    x1: xMax,
                    y0: chartDomain.min,
                    y1: threshold.value,
                  },
                },
              ]}
            />
          ) : null}
          {threshold && threshold.value && isAbove ? (
            <RectAnnotation
              id="above-threshold"
              style={{
                fill: colorTransformer(Color.color1),
                opacity: THRESHOLD_OPACITY,
              }}
              dataValues={[
                {
                  coordinates: {
                    x0: xMin,
                    x1: xMax,
                    y0: threshold.value,
                    y1: chartDomain.max,
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
          <Axis
            id={'values'}
            position={Position.Left}
            tickFormat={yAxisFormatter}
            domain={chartDomain}
          />
          <Settings tooltip={tooltipProps} theme={getChartTheme(isDarkMode)} />
        </Chart>
      </ChartContainer>
      <div style={{ textAlign: 'center' }}>
        {groupByLabel != null ? (
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.infra.logs.alerts.dataTimeRangeLabelWithGrouping"
              defaultMessage="Last {lookback} {timeLabel} of data, grouped by {groupByLabel} (showing {displayedGroups}/{totalGroups} groups)"
              values={{
                groupByLabel,
                timeLabel,
                lookback,
                displayedGroups: filteredSeries.length,
                totalGroups: series.length,
              }}
            />
          </EuiText>
        ) : (
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.infra.logs.alerts.dataTimeRangeLabel"
              defaultMessage="Last {lookback} {timeLabel} of data"
              values={{ timeLabel, lookback }}
            />
          </EuiText>
        )}
      </div>
    </>
  );
};
