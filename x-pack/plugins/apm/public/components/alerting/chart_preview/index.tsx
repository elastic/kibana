/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  Chart,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  TickFormatter,
} from '@elastic/charts';
import { EuiSpacer } from '@elastic/eui';
import { max as getMax, min as getMin } from 'lodash';
import moment from 'moment';
import React from 'react';
import { Coordinate } from '../../../../typings/timeseries';

interface Props {
  yTickFormat?: TickFormatter;
  data?: Coordinate[];
}

export function ChartPreview({ data = [], yTickFormat }: Props) {
  if (!data.length) {
    return null;
  }

  const timestamps = data.map((d) => d.x);
  const min = moment.utc(getMax(timestamps)).valueOf();
  const max = moment.utc(getMin(timestamps)).valueOf();

  const xFormatter = niceTimeFormatter([min, max]);

  return (
    <>
      <EuiSpacer size="m" />
      <div style={{ height: 150 }}>
        <Chart>
          <Settings tooltip="none" />
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
          />
        </Chart>
      </div>
    </>
  );
}
