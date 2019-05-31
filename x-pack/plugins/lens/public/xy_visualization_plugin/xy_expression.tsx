/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {
  Chart,
  Settings,
  Axis,
  LineSeries,
  getAxisId,
  getSpecId,
  AreaSeries,
  BarSeries,
} from '@elastic/charts';
import { KibanaDatatable } from '../types';
import { XYArgs } from './types';

// TODO: Specify the TypeScript type of this definition, once the
// ContextFunction has moved to core and has the correct signature:
// ContextFunction<'lens_xy_chart', KibanaDatatable, XYArgs, XYRender>
export const xyChart = {
  name: 'lens_xy_chart',
  type: 'render',
  args: {
    seriesType: {
      types: ['string'],
      options: ['bar', 'line', 'area'],
      help: 'The type of chart to display.',
    },
    title: {
      types: ['string'],
      help: 'The char title.',
    },
    legend: {
      types: ['lens_xy_legendConfig'],
      help: 'Configure the chart legend.',
    },
    y: {
      types: ['lens_xy_yConfig'],
      help: 'The y axis configuration',
    },
    x: {
      types: ['lens_xy_xConfig'],
      help: 'The x axis configuration',
    },
    splitSeriesAccessors: {
      types: ['string'],
      multi: true,
      help: 'The columns used to split the series.',
    },
    stackAccessors: {
      types: ['string'],
      multi: true,
      help: 'The columns used to stack the series.',
    },
  },
  context: {
    types: ['kibana_datatable'],
  },
  fn(data: KibanaDatatable, args: XYArgs) {
    return {
      type: 'render',
      as: 'lens_xy_chart_renderer',
      value: {
        data,
        args,
      },
    };
  },
};

export interface XYChartProps {
  data: KibanaDatatable;
  args: XYArgs;
}

export const xyChartRenderer = {
  name: 'lens_xy_chart_renderer',
  displayName: 'XY Chart',
  reuseDomNode: true,
  render: async (domNode: HTMLDivElement, config: XYChartProps, _handlers: unknown) => {
    ReactDOM.render(<XYChart {...config} />, domNode);
  },
};

export function XYChart({ data, args }: XYChartProps) {
  const { legend, x, y, splitSeriesAccessors, stackAccessors, seriesType } = args;
  const seriesProps = {
    splitSeriesAccessors,
    stackAccessors,
    id: getSpecId(y.accessors.join(',')),
    xAccessor: x.accessor,
    yAccessors: y.accessors,
    data: data.rows,
  };

  return (
    <Chart className="lnsChart">
      <Settings showLegend={legend.isVisible} legendPosition={legend.position} />

      <Axis
        id={getAxisId('x')}
        position={x.position}
        title={x.title}
        showGridLines={x.showGridlines}
      />

      <Axis
        id={getAxisId('y')}
        position={y.position}
        title={y.title}
        showGridLines={y.showGridlines}
      />

      {seriesType === 'line' ? (
        <LineSeries {...seriesProps} />
      ) : seriesType === 'bar' ? (
        <BarSeries {...seriesProps} />
      ) : (
        <AreaSeries {...seriesProps} />
      )}
    </Chart>
  );
}
