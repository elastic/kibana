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
  Tooltip,
  niceTimeFormatter,
} from '@elastic/charts';
import { EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import { IUiSettingsClient } from '@kbn/core/public';
import { TimeUnitChar } from '@kbn/observability-plugin/common';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { Coordinate } from '../../../../../typings/timeseries';
import { useTheme } from '../../../../hooks/use_theme';
import { getTimeZone } from '../../../shared/charts/helper/timezone';
import {
  TimeLabelForData,
  TIME_LABELS,
  getDomain,
} from './chart_preview_helper';
import { ALERT_PREVIEW_BUCKET_SIZE } from '../../utils/helper';

interface ChartPreviewProps {
  yTickFormat?: TickFormatter;
  threshold: number;
  uiSettings?: IUiSettingsClient;
  series: Array<{ name?: string; data: Coordinate[] }>;
  timeSize?: number;
  timeUnit?: TimeUnitChar;
  totalGroups: number;
}

export function ChartPreview({
  yTickFormat,
  threshold,
  uiSettings,
  series,
  timeSize = 5,
  timeUnit = 'm',
  totalGroups,
}: ChartPreviewProps) {
  const theme = useTheme();
  const thresholdOpacity = 0.3;
  const DEFAULT_DATE_FORMAT = 'Y-MM-DD HH:mm:ss';

  const style = {
    fill: theme.eui.euiColorVis2,
    line: {
      strokeWidth: 2,
      stroke: theme.eui.euiColorVis2,
      opacity: 1,
    },
    opacity: thresholdOpacity,
  };

  const barSeries = useMemo(() => {
    return series.flatMap((serie) =>
      serie.data.map((point) => ({ ...point, groupBy: serie.name }))
    );
  }, [series]);

  const timeZone = getTimeZone(uiSettings);

  const legendSize =
    series.length > 1 ? Math.ceil(series.length / 2) * 30 : series.length * 35;

  const chartSize = 150;

  const { yMin, yMax, xMin, xMax } = getDomain(series);
  const chartDomain = {
    max: Math.max(yMax, threshold) * 1.1, // Add 10% headroom.
    min: Math.min(yMin, threshold) * 0.9, // Add 10% headroom.
  };

  const dateFormatter = useMemo(
    () => niceTimeFormatter([xMin, xMax]),
    [xMin, xMax]
  );

  const lookback = timeSize * ALERT_PREVIEW_BUCKET_SIZE;
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
        <Tooltip
          type="none"
          headerFormatter={({ value }) => {
            const dateFormat =
              (uiSettings && uiSettings.get(UI_SETTINGS.DATE_FORMAT)) ||
              DEFAULT_DATE_FORMAT;
            return moment(value).format(dateFormat);
          }}
        />
        <Settings
          showLegend={true}
          legendPosition={'bottom'}
          legendSize={legendSize}
          locale={i18n.getLocale()}
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
      {series.length > 0 && (
        <TimeLabelForData
          lookback={lookback}
          timeLabel={timeLabel}
          displayedGroups={series.length}
          totalGroups={totalGroups}
        />
      )}
    </>
  );
}
