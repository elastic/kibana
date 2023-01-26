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
  niceTimeFormatter,
  Position,
  RectAnnotation,
  RectAnnotationDatum,
  ScaleType,
  Settings,
  TickFormatter,
} from '@elastic/charts';
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { IUiSettingsClient } from '@kbn/core/public';
import { Coordinate } from '../../../../../typings/timeseries';
import { useTheme } from '../../../../hooks/use_theme';
import { getTimeZone } from '../../../shared/charts/helper/timezone';

interface ChartPreviewProps {
  yTickFormat?: TickFormatter;
  threshold: number;
  uiSettings?: IUiSettingsClient;
  series: Array<{ name?: string; data: Coordinate[] }>;
}

export function ChartPreview({
  yTickFormat,
  threshold,
  uiSettings,
  series,
}: ChartPreviewProps) {
  const theme = useTheme();
  const thresholdOpacity = 0.3;
  const timestamps = series.flatMap(({ data }) => data.map(({ x }) => x));
  const xMin = Math.min(...timestamps);
  const xMax = Math.max(...timestamps);
  const xFormatter = niceTimeFormatter([xMin, xMax]);

  const style = {
    fill: theme.eui.euiColorVis2,
    line: {
      strokeWidth: 2,
      stroke: theme.eui.euiColorVis2,
      opacity: 1,
    },
    opacity: thresholdOpacity,
  };

  const rectDataValues: RectAnnotationDatum[] = [
    {
      coordinates: {
        x0: null,
        x1: null,
        y0: threshold,
        y1: null,
      },
    },
  ];

  const timeZone = getTimeZone(uiSettings);
  const legendSize = Math.ceil(series.length / 2) * 30;
  const chartSize = 150;

  return (
    <>
      <EuiSpacer size="m" />
      <Chart
        size={{
          height: series.length > 1 ? chartSize + legendSize : chartSize,
        }}
        data-test-subj="ChartPreview"
      >
        <Settings
          tooltip="none"
          showLegend={series.length > 1}
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
          showOverlappingTicks
          tickFormat={xFormatter}
        />
        <Axis
          id="chart_preview_y_axis"
          position={Position.Left}
          tickFormat={yTickFormat}
          ticks={5}
        />
        {series.map(({ name, data }, index) => (
          <BarSeries
            key={index}
            timeZone={timeZone}
            data={data}
            id={`chart_preview_bar_series_${name || index}`}
            name={name}
            xAccessor="x"
            xScaleType={ScaleType.Time}
            yAccessors={['y']}
            yScaleType={ScaleType.Linear}
          />
        ))}
      </Chart>
    </>
  );
}
