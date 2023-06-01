/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Chart,
  BarSeries,
  ScaleType,
  LineAnnotation,
  RectAnnotation,
  Axis,
  Settings,
  Position,
  AnnotationDomainType,
} from '@elastic/charts';
import React, { ReactElement, useEffect, useMemo } from 'react';
import { useKibana } from '@kbn/react-public';
import { ExecutionTimeRange } from '../../../../../types';
import { decodeOrThrow } from '../../../../../../common/runtime_types';
import {
  GetLogAlertsChartPreviewDataAlertParamsSubset,
  getLogAlertsChartPreviewDataAlertParamsSubsetRT,
} from '../../../../../../common/http_api';
import {
  Comparator,
  PartialRuleParams,
  Threshold,
} from '../../../../../../common/alerting/logs/log_threshold';
import { PersistedLogViewReference } from '../../../../../../common/log_views';
import { useKibanaTimeZoneSetting } from '../../../../../hooks/use_kibana_time_zone_setting';
import { getChartTheme } from '../../../../../utils/get_chart_theme';
import {
  yAxisFormatter,
  tooltipProps,
  getDomain,
  useDateFormatter,
  LoadingState,
  ErrorState,
  NoDataState,
  ChartContainer,
} from '../../../../common/criterion_preview_chart/criterion_preview_chart';
import { Color, colorTransformer } from '../../../../../../common/color_palette';
import { useChartPreviewData } from '../../expression_editor/hooks/use_chart_preview_data';

interface ChartProps {
  buckets: number;
  logViewReference: PersistedLogViewReference;
  ruleParams: PartialRuleParams;
  threshold?: Threshold;
  showThreshold: boolean;
  executionTimeRange?: ExecutionTimeRange;
  filterSeriesByGroupName?: string;
  annotations?: Array<ReactElement<typeof RectAnnotation | typeof LineAnnotation>>;
}

const LogsRatioChart: React.FC<ChartProps> = ({
  buckets,
  ruleParams,
  logViewReference,
  threshold,
  showThreshold,
  executionTimeRange,
  filterSeriesByGroupName,
  annotations,
}) => {
  const chartAlertParams: GetLogAlertsChartPreviewDataAlertParamsSubset | null = useMemo(() => {
    const params = {
      criteria: ruleParams.criteria,
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
    ruleParams.criteria,
    ruleParams.count.comparator,
    ruleParams.count.value,
    ruleParams.timeSize,
    ruleParams.timeUnit,
    ruleParams.groupBy,
  ]);
  const {
    getChartPreviewData,
    isLoading,
    hasError,
    chartPreviewData: series,
  } = useChartPreviewData({
    logViewReference,
    ruleParams: chartAlertParams,
    buckets,
    executionTimeRange,
    filterSeriesByGroupName,
  });

  useEffect(() => {
    getChartPreviewData();
  }, [getChartPreviewData]);

  const { uiSettings } = useKibana().services;
  const isDarkMode = uiSettings?.get('theme:darkMode') || false;
  const timezone = useKibanaTimeZoneSetting();
  const { yMin, yMax, xMin, xMax } = getDomain(series, false);
  const dateFormatter = useDateFormatter(xMin, xMax);
  const hasData = series.length > 0;
  const THRESHOLD_OPACITY = 0.3;
  const chartDomain = {
    max: showThreshold && threshold ? Math.max(yMax, threshold.value) * 1.1 : yMax * 1.1, // Add 10% headroom.
    min: showThreshold && threshold ? Math.min(yMin, threshold.value) : yMin,
  };
  const isAbove =
    showThreshold && threshold && threshold.comparator
      ? [Comparator.GT, Comparator.GT_OR_EQ].includes(threshold.comparator)
      : false;

  const isBelow =
    showThreshold && threshold && threshold.comparator
      ? [Comparator.LT, Comparator.LT_OR_EQ].includes(threshold.comparator)
      : false;
  const barSeries = useMemo(() => {
    return series.flatMap(({ points, id }) => points.map((point) => ({ ...point, groupBy: id })));
  }, [series]);

  if (isLoading) {
    return <LoadingState />;
  } else if (hasError) {
    return <ErrorState />;
  } else if (!hasData) {
    return <NoDataState />;
  }
  return (
    <ChartContainer>
      <Chart>
        <BarSeries
          id="criterion-preview"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="timestamp"
          yAccessors={['value']}
          splitSeriesAccessors={['groupBy']}
          data={barSeries}
          barSeriesStyle={{
            rectBorder: {
              stroke: colorTransformer(Color.color0),
              strokeWidth: 1,
              visible: true,
            },
            rect: {
              opacity: 1,
            },
          }}
          color={colorTransformer(Color.color0)}
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
        {annotations}
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
  );
};
// eslint-disable-next-line import/no-default-export
export default LogsRatioChart;
