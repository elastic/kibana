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
import { EuiSpacer, EuiIcon } from '@elastic/eui';
import { max as getMax, min as getMin } from 'lodash';
import moment from 'moment';
import React from 'react';
import { Coordinate } from '../../../../typings/timeseries';
import { useTheme } from '../../../hooks/useTheme';

interface Props {
  yTickFormat?: TickFormatter;
  data?: Coordinate[];
  threshold: number;
  windowSize: number;
  windowUnit: string;
}

const THRESHOLD_OPACITY = 0.3;

export function ChartPreview({
  data = [],
  yTickFormat,
  threshold,
  windowSize,
  windowUnit,
}: Props) {
  const theme = useTheme();
  if (!data.length) {
    return null;
  }

  const timestamps = data.map((d) => d.x);
  const min = moment.utc(getMax(timestamps)).valueOf();
  const max = moment.utc(getMin(timestamps)).valueOf();

  const xFormatter = niceTimeFormatter([min, max]);

  const style = {
    line: {
      strokeWidth: 2,
      stroke: theme.eui.euiColorVis9,
      opacity: 1,
    },
  };

  const dataValuesGreen: RectAnnotationDatum[] = [
    {
      coordinates: {
        x0: null,
        x1: null,
        y0: threshold,
        y1: null,
      },
      details: `Threshold: ${yTickFormat ? yTickFormat(threshold) : threshold}`,
    },
  ];

  return (
    <>
      <EuiSpacer size="m" />
      <div style={{ height: 150 }}>
        <Chart>
          <Settings tooltip="none" />
          <LineAnnotation
            id="annotation_1"
            domainType={AnnotationDomainTypes.YDomain}
            dataValues={[{ dataValue: threshold }]}
            markerPosition="left"
            style={style}
          />

          <RectAnnotation
            dataValues={dataValuesGreen}
            id="rect3"
            style={{ fill: theme.eui.euiColorVis9, opacity: THRESHOLD_OPACITY }}
          />

          <Axis
            id="x-axis"
            position={Position.Bottom}
            showOverlappingTicks
            tickFormat={xFormatter}
          />
          <Axis id="y-axis" position={Position.Left} tickFormat={yTickFormat} />

          <BarSeries
            id="chart_preview"
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={data}
            color={theme.eui.euiColorVis1}
          />
        </Chart>
      </div>
    </>
  );
}
