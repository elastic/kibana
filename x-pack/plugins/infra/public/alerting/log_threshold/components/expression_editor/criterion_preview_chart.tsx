/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  ScaleType,
  AnnotationDomainType,
  Position,
  Axis,
  BarSeries,
  Chart,
  Settings,
  RectAnnotation,
  LineAnnotation,
} from '@elastic/charts';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
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
} from '../../../common/criterion_preview_chart/criterion_preview_chart';
import {
  PartialRuleParams,
  Threshold,
  Criterion,
  Comparator,
} from '../../../../../common/alerting/logs/log_threshold/types';
import { Color, colorTransformer } from '../../../../../common/color_palette';
import {
  GetLogAlertsChartPreviewDataAlertParamsSubset,
  getLogAlertsChartPreviewDataAlertParamsSubsetRT,
} from '../../../../../common/http_api/log_alerts';
import { useChartPreviewData } from './hooks/use_chart_preview_data';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import { useKibanaTimeZoneSetting } from '../../../../hooks/use_kibana_time_zone_setting';

const GROUP_LIMIT = 5;

interface Props {
  ruleParams: PartialRuleParams;
  chartCriterion: Partial<Criterion>;
  sourceId: string;
  showThreshold: boolean;
}

export const CriterionPreview: React.FC<Props> = ({
  ruleParams,
  chartCriterion,
  sourceId,
  showThreshold,
}) => {
  const chartAlertParams: GetLogAlertsChartPreviewDataAlertParamsSubset | null = useMemo(() => {
    const { field, comparator, value } = chartCriterion;
    const criteria = field && comparator && value ? [{ field, comparator, value }] : [];
    const params = {
      criteria,
      count: {
        comparator: ruleParams.count.comparator,
        value: ruleParams.count.value,
      },
      timeSize: ruleParams.timeSize,
      timeUnit: ruleParams.timeUnit,
      groupBy: ruleParams.groupBy,
    };

    try {
      return decodeOrThrow(getLogAlertsChartPreviewDataAlertParamsSubsetRT)(params);
    } catch (error) {
      return null;
    }
  }, [
    ruleParams.timeSize,
    ruleParams.timeUnit,
    ruleParams.groupBy,
    ruleParams.count.comparator,
    ruleParams.count.value,
    chartCriterion,
  ]);

  // Check for the existence of properties that are necessary for a meaningful chart.
  if (chartAlertParams === null || chartAlertParams.criteria.length === 0) return null;

  return (
    <CriterionPreviewChart
      buckets={
        !chartAlertParams.groupBy || chartAlertParams.groupBy.length === 0
          ? NUM_BUCKETS
          : NUM_BUCKETS / 4
      } // Display less data for groups due to space limitations
      sourceId={sourceId}
      threshold={ruleParams.count}
      chartAlertParams={chartAlertParams}
      showThreshold={showThreshold}
    />
  );
};

interface ChartProps {
  buckets: number;
  sourceId: string;
  threshold?: Threshold;
  chartAlertParams: GetLogAlertsChartPreviewDataAlertParamsSubset;
  showThreshold: boolean;
}

const CriterionPreviewChart: React.FC<ChartProps> = ({
  buckets,
  sourceId,
  threshold,
  chartAlertParams,
  showThreshold,
}) => {
  const { uiSettings } = useKibana().services;
  const isDarkMode = uiSettings?.get('theme:darkMode') || false;
  const timezone = useKibanaTimeZoneSetting();

  const {
    getChartPreviewData,
    isLoading,
    hasError,
    chartPreviewData: series,
  } = useChartPreviewData({
    sourceId,
    ruleParams: chartAlertParams,
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
    showThreshold && threshold && threshold.comparator
      ? [Comparator.GT, Comparator.GT_OR_EQ].includes(threshold.comparator)
      : false;

  const isBelow =
    showThreshold && threshold && threshold.comparator
      ? [Comparator.LT, Comparator.LT_OR_EQ].includes(threshold.comparator)
      : false;

  // For grouped scenarios we want to limit the groups displayed, for "isAbove" thresholds we'll show
  // groups with the highest doc counts. And for "isBelow" thresholds we'll show groups with the lowest doc counts.
  // Ratio scenarios will just default to max.
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
    max: showThreshold && threshold ? Math.max(yMax, threshold.value) * 1.1 : yMax * 1.1, // Add 10% headroom.
    min: showThreshold && threshold ? Math.min(yMin, threshold.value) : yMin,
  };

  if (showThreshold && threshold && chartDomain.min === threshold.value) {
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
            xScaleType={ScaleType.Time}
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
            timeZone={timezone}
          />
          {showThreshold && threshold ? (
            <LineAnnotation
              id={`threshold-line`}
              domainType={AnnotationDomainType.YDomain}
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
          {showThreshold && threshold && isBelow ? (
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
          {showThreshold && threshold && isAbove ? (
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
