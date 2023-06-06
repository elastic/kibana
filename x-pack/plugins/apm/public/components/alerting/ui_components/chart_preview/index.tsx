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
} from '@elastic/charts';
import { EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import { IUiSettingsClient } from '@kbn/core/public';
import { TimeUnitChar } from '@kbn/observability-plugin/common';
import { Maybe } from '../../../../../typings/common';
import { Coordinate } from '../../../../../typings/timeseries';
import { useTheme } from '../../../../hooks/use_theme';
import { getTimeZone } from '../../../shared/charts/helper/timezone';
import {
  TimeLabelForData,
  NUM_BUCKETS,
  TIME_LABELS,
  tooltipProps,
  getDomain,
  useDateFormatter,
} from './chart_preview_helper';

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

  // For grouped scenarios we want to limit the groups displayed, for "isAbove" thresholds we'll show
  // groups with the highest doc counts. And for "isBelow" thresholds we'll show groups with the lowest doc counts.
  // Ratio scenarios will just default to max.
  const filteredSeries = useMemo(() => {
    const sortedSeries = series.sort((a, b) => {
      const aMax = Math.max(...a.data.map((point) => point.y as number));
      const bMax = Math.max(...b.data.map((point) => point.y as number));
      return bMax - aMax;
    });
    return sortedSeries.slice(0, 3);
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

  // const timestamps = filteredSeries.flatMap(({ data }) => data.map(({ x }) => x));
  // const xMin = Math.min(...timestamps);
  // const xMax = Math.max(...timestamps);
  // const xFormatter = niceTimeFormatter([xMin, xMax]);

  const timeZone = getTimeZone(uiSettings);

  const legendSize =
    filteredSeries.length > 1
      ? Math.ceil(filteredSeries.length / 2) * 30
      : filteredSeries.length * 35;

  const chartSize = 150;

  // const domainYMax = () => {
  //   const values = filteredSeries.flatMap(({ data }) => data.map((d) => d.y ?? 0));
  //   return Math.max(...values, threshold) * 1.1;
  // };

  // const domain = {
  //   max: domainYMax(),
  //   min: 0,
  // };

  const { yMin, yMax, xMin, xMax } = getDomain(filteredSeries, false);
  const chartDomain = {
    max: Math.max(yMax, threshold) * 1.1, // Add 10% headroom.
    min: Math.min(yMin, threshold),
  };

  if (chartDomain.min === threshold) {
    chartDomain.min = chartDomain.min * 0.9; // Allow some padding so the threshold annotation has better visibility
  }

  const dateFormatter = useDateFormatter(xMin, xMax);

  const lookback = timeSize * NUM_BUCKETS;
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
