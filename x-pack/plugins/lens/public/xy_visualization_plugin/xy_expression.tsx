/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {
  Position,
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

/**
 * This file contains TypeScript type definitions and their equivalent expression
 * definitions, for configuring and rendering an XY chart. The XY chart serves
 * triple duty as a bar, line, or area chart.
 *
 * The xy_chart expression function serves mostly as a passthrough to the xy_chart_renderer
 * which does the heavy-lifting.
 */

export interface LegendConfig {
  isVisible: boolean;
  position: Position;
}

export const legendConfig = {
  name: 'legendConfig',
  aliases: [],
  type: 'legendConfig',
  help: `Configure a chart's legend`,
  context: {
    types: ['null'],
  },
  args: {
    isVisible: { types: ['boolean'] },
    position: { types: ['string'] },
  },
  fn: function fn(_context: unknown, args: LegendConfig) {
    return {
      type: 'legendConfig',
      ...args,
    };
  },
};

interface AxisConfig {
  title: string;
  showGridlines: boolean;
  position: Position;
}

const axisConfig = {
  title: { types: ['string'] },
  showGridlines: { types: ['boolean'] },
  position: { types: ['string'] },
};

export interface YConfig extends AxisConfig {
  accessors: string[];
}

export const yConfig = {
  name: 'yConfig',
  aliases: [],
  type: 'yConfig',
  help: `Configure a chart's y axis`,
  context: {
    types: ['null'],
  },
  args: {
    ...axisConfig,
    accessors: {
      types: ['string'],
      multi: true,
    },
  },
  fn: function fn(_context: unknown, args: YConfig) {
    return {
      type: 'yConfig',
      ...args,
    };
  },
};

export interface XConfig extends AxisConfig {
  accessor: string;
}

export const xConfig = {
  name: 'xConfig',
  aliases: [],
  type: 'xConfig',
  help: `Configure a chart's x axis`,
  context: {
    types: ['null'],
  },
  args: {
    ...axisConfig,
    accessor: { types: ['string'] },
  },
  fn: function fn(_context: unknown, args: XConfig) {
    return {
      type: 'xConfig',
      ...args,
    };
  },
};

export interface XYArgs {
  seriesType: 'bar' | 'line' | 'area';
  title: string;
  legend: LegendConfig;
  y: YConfig;
  x: XConfig;
  splitSeriesAccessors: string[];
  stackAccessors: string[];
}

export interface XYChartProps {
  data: KibanaDatatable;
  args: XYArgs;
}

export const xyChart = {
  name: 'xy_chart',
  type: 'render',
  args: {
    seriesType: {
      types: ['string'],
      options: ['bar', 'line', 'area'],
    },
    title: { types: ['string'] },
    legend: { types: ['legendConfig'] },
    y: { types: ['yConfig'] },
    x: { types: ['xConfig'] },
    splitSeriesAccessors: {
      types: ['string'],
      multi: true,
    },
    stackAccessors: {
      types: ['string'],
      multi: true,
    },
  },
  context: { types: ['kibana_datatable'] },
  fn(data: KibanaDatatable, args: XYArgs) {
    return {
      type: 'render',
      as: 'xy_chart_renderer',
      value: {
        data,
        args,
      },
    };
  },
};

export const xyChartRenderer = {
  name: 'xy_chart_renderer',
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
