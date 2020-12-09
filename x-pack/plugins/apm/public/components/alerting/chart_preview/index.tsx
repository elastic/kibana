/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AnnotationDomainTypes,
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
import { max as getMax, min as getMin } from 'lodash';
import moment from 'moment';
import React from 'react';
import styled from 'styled-components';
import { Coordinate } from '../../../../typings/timeseries';
import { useTheme } from '../../../hooks/use_theme';

const ChartWithHeight = styled(Chart)`
  height: 150px;
`;

interface ChartPreviewProps {
  yTickFormat?: TickFormatter;
  data?: Coordinate[];
  threshold: number;
}

export function ChartPreview({
  data = [],
  yTickFormat,
  threshold,
}: ChartPreviewProps) {
  const theme = useTheme();

  if (!data.length) {
    return null;
  }

  const thresholdOpacity = 0.3;
  const timestamps = data.map((d) => d.x);
  const xMin = moment.utc(getMax(timestamps)).valueOf();
  const xMax = moment.utc(getMin(timestamps)).valueOf();
  const xFormatter = niceTimeFormatter([xMin, xMax]);

  // Make the maximum Y value either the actual max or 20% more than the threshold
  const values = data.map((d) => d.y ?? 0);
  const yMax = Math.max(Math.max(...values), threshold * 1.2);

  const style = {
    fill: theme.eui.euiColorVis9,
    line: {
      strokeWidth: 2,
      stroke: theme.eui.euiColorVis9,
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

  return (
    <>
      <EuiSpacer size="m" />
      <ChartWithHeight data-test-subj="ChartPreview">
        <Settings tooltip="none" />
        <LineAnnotation
          dataValues={[{ dataValue: threshold }]}
          domainType={AnnotationDomainTypes.YDomain}
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
          domain={{ max: yMax }}
        />
        <BarSeries
          color={theme.eui.euiColorVis1}
          data={data}
          id="chart_preview_bar_series"
          xAccessor="x"
          xScaleType={ScaleType.Linear}
          yAccessors={['y']}
          yScaleType={ScaleType.Linear}
        />
      </ChartWithHeight>
    </>
  );
}
