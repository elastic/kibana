/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnnotationDomainType,
  Axis,
  BarSeries,
  Chart,
  LineAnnotation,
  Position,
  RectAnnotation,
  RectAnnotationDatum,
  ScaleType,
  Settings,
  TickFormatter,
  TooltipProps,
} from '@elastic/charts';
import { EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import { IUiSettingsClient } from '@kbn/core/public';
import { TimeUnitChar } from '@kbn/observability-plugin/common';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import moment from 'moment';
import { Maybe } from '../../../../../typings/common';
import { Coordinate } from '../../../../../typings/timeseries';
import { useTheme } from '../../../../hooks/use_theme';
import { getTimeZone } from '../../../shared/charts/helper/timezone';
import {
  TimeLabelForData,
  TIME_LABELS,
  getDomain,
  useDateFormatter,
} from './chart_preview_helper';
import { NUM_BUCKETS_FOR_PREVIEW_CHART } from '../../../../../common/rules/apm_rule_types';

interface ChartPreviewProps {
  yTickFormat?: TickFormatter;
  threshold: number;
  uiSettings?: IUiSettingsClient;
  series: Array<{ name?: string; data: Coordinate[] }>;
  timeSize?: number;
  timeUnit?: TimeUnitChar;
}

export function ChartPreview({
  yTickFormat,
  threshold,
  uiSettings,
  series,
  timeSize = 5,
  timeUnit = 'm',
}: ChartPreviewProps) {
  const theme = useTheme();
  const thresholdOpacity = 0.3;

  const style = {
    fill: theme.eui.euiColorVis2,
    line: {
      strokeWidth: 2,
      stroke: theme.eui.euiColorVis2,
      opacity: 1,
    },
    opacity: thresholdOpacity,
  };

  const DEFAULT_DATE_FORMAT = 'Y-MM-DD HH:mm:ss';

  const tooltipProps: TooltipProps = {
    headerFormatter: ({ value }) => {
      const dateFormat =
        (uiSettings && uiSettings.get(UI_SETTINGS.DATE_FORMAT)) ||
        DEFAULT_DATE_FORMAT;
      return moment(value).format(dateFormat);
    },
  };

  const filteredSeries = useMemo(() => {
    const sortedSeries = series.sort((a, b) => {
      const aMax = Math.max(...a.data.map((point) => point.y as number));
      const bMax = Math.max(...b.data.map((point) => point.y as number));
      return bMax - aMax;
    });
    return sortedSeries.slice(0, NUM_BUCKETS_FOR_PREVIEW_CHART);
  }, [series]);

  const barSeries = useMemo(() => {
    return filteredSeries.reduce<
      Array<{ x: number; y: Maybe<number>; groupBy: string | undefined }>
    >((acc, serie) => {
      const barPoints = serie.data.reduce<
        Array<{ x: number; y: Maybe<number>; groupBy: string | undefined }>
      >((pointAcc, point) => {
        return [...pointAcc, { ...point, groupBy: serie.name }];
      }, []);
      return [...acc, ...barPoints];
    }, []);
  }, [filteredSeries]);

  const timeZone = getTimeZone(uiSettings);

  const legendSize =
    filteredSeries.length > 1
      ? Math.ceil(filteredSeries.length / 2) * 30
      : filteredSeries.length * 35;

  const chartSize = 150;

  const { yMin, yMax, xMin, xMax } = getDomain(filteredSeries);
  const chartDomain = {
    max: Math.max(yMax, threshold) * 1.1, // Add 10% headroom.
    min: Math.min(yMin, threshold),
  };

  if (chartDomain.min === threshold) {
    chartDomain.min = chartDomain.min * 0.9; // Allow some padding so the threshold annotation has better visibility
  }

  const dateFormatter = useDateFormatter(xMin, xMax);

  const lookback = timeSize * NUM_BUCKETS_FOR_PREVIEW_CHART;
  const timeLabel = TIME_LABELS[timeUnit as keyof typeof TIME_LABELS];

  const rectDataValues: RectAnnotationDatum[] = [
    {
      coordinates: {
        x0: xMin,
        x1: xMax,
        y0: threshold,
        y1: chartDomain.max,
      },
    },
  ];

  return (
    <>
      <EuiSpacer size="m" />
      <Chart
        size={{
          height: chartSize + legendSize,
        }}
        data-test-subj="ChartPreview"
      >
        <Settings
          tooltip={tooltipProps}
          showLegend={true}
          legendPosition={'bottom'}
          legendSize={legendSize}
        />
        <LineAnnotation
          dataValues={[{ dataValue: threshold }]}
          domainType={AnnotationDomainType.YDomain}
          id="chart_preview_line_annotation"
          markerPosition="left"
          style={style}
        />
        <RectAnnotation
          dataValues={rectDataValues}
          hideTooltips={true}
          id="chart_preview_rect_annotation"
          style={style}
        />
        <Axis
          id="chart_preview_x_axis"
          position={Position.Bottom}
          showOverlappingTicks={true}
          tickFormat={dateFormatter}
        />
        <Axis
          id="chart_preview_y_axis"
          position={Position.Left}
          tickFormat={yTickFormat}
          ticks={5}
          domain={chartDomain}
        />
        <BarSeries
          id="apm-chart-preview"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          splitSeriesAccessors={['groupBy']}
          data={barSeries}
          barSeriesStyle={{
            rectBorder: {
              strokeWidth: 1,
              visible: true,
            },
            rect: {
              opacity: 1,
            },
          }}
          timeZone={timeZone}
        />
      </Chart>
      {filteredSeries.length > 0 && (
        <TimeLabelForData
          lookback={lookback}
          timeLabel={timeLabel}
          displayedGroups={filteredSeries.length}
          totalGroups={series.length}
        />
      )}
    </>
  );
}
