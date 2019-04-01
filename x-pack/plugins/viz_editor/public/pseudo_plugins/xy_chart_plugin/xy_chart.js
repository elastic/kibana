/* eslint-disable */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  getAxisId,
  getSpecId,
  LineSeries,
  Position,
  ScaleType,
} from '@elastic/charts';
import React from 'react';

// TODO it is necssary to have all usages of elastic-charts into js for now
// because there is a problem with the typings (prob. some clash with the rest of the Kibana setup)
// as soon these are sorted out, this can be transfered to TS

function getXScaleType(xAxisType) {
  if (xAxisType === 'time') return ScaleType.Time;
  if (xAxisType === 'linear') return ScaleType.Linear;
  return ScaleType.Ordinal;
}

export function XyChart({ config }) {
  return (
    <Chart renderer="canvas" className={'story-chart'}>
      <Axis
        id={getAxisId('bottom')}
        title={'timestamp per 1 minute'}
        position={Position.Bottom}
        showOverlappingTicks={true}
      />
      <Axis
        id={getAxisId('left')}
        title={config.title}
        position={Position.Left}
        tickFormat={d => Number(d).toFixed(2)}
      />

      {config.seriesType === 'line' ? (
        <LineSeries
          id={getSpecId('lines')}
          xScaleType={getXScaleType(config.xAxisType)}
          yScaleType={ScaleType.Linear}
          xAccessor={0}
          yAccessors={[1]}
          data={config.data}
          yScaleToDataExtent={false}
        />
      ) : (
        <AreaSeries
          id={getSpecId('area')}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={0}
          yAccessors={[1]}
          data={config.data}
          yScaleToDataExtent={false}
        />
      )}
    </Chart>
  );
}
