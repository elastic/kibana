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
import { Datatable } from '../../../canvas/canvas_plugin_src/functions/types';

/**
 * This file contains TypeScript type definitions and their equivalent expression
 * definitions, for configuring and rendering an XY chart. The XY chart serves
 * triple duty as a bar, line, or area chart.
 *
 * The xy_chart expression function serves mostly as a passthrough to the xy_chart_renderer
 * which does the heavy-lifting.
 */

/**
 * Configuration for the chart's legend.
 */
export interface LegendConfig {
  isVisible: boolean;
  position: Position;
}

/**
 * LegendConfig as an expression type.
 */
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
  fn: function fn(_context: any, args: LegendConfig) {
    return {
      type: 'legendConfig',
      ...args,
    };
  },
};

/**
 * Properties common to all axes.
 */
interface AxisConfig {
  title: string;
  showGridlines: boolean;
  position: Position;
}

/**
 * AxisConfig expression definition.
 */
const axisConfig = {
  title: { types: ['string'] },
  showGridlines: { types: ['boolean'] },
  position: { types: ['string'] },
};

/**
 * Y-axis configuration.
 */
export interface YConfig extends AxisConfig {
  accessors: string[];
}

/**
 * YConfig as an expression type.
 */
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
  fn: function fn(_context: any, args: YConfig) {
    return {
      type: 'yConfig',
      ...args,
    };
  },
};

/**
 * X-axis configuration.
 */
export interface XConfig extends AxisConfig {
  accessor: string;
}

/**
 * XConfig as an expression type.
 */
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
  fn: function fn(_context: any, args: XConfig) {
    return {
      type: 'xConfig',
      ...args,
    };
  },
};

/**
 * The arguments to the XY chart expression function.
 */
export interface XYArgs {
  seriesType: 'bar' | 'line' | 'area';
  title: string;
  legend: LegendConfig;
  y: YConfig;
  x: XConfig;
  splitSeriesAccessors: string[];
  stackAccessors: string[];
}

/**
 * The XY chart expression function.
 */
export const xyChart = {
  name: 'xy_chart',
  type: 'render',
  args: {
    seriesType: { types: ['string'] },
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
  fn(data: Datatable, args: XYArgs) {
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

/**
 * The XY chart expression renderer.
 */
export const xyChartRenderer = {
  name: 'xy_chart_renderer',
  displayName: 'XY Chart',
  reuseDomNode: true,
  render: async (domNode: HTMLDivElement, config: any, _handlers: any) => {
    ReactDOM.render(<XYChart {...config} />, domNode);
  },
};

/**
 * Render an XY chart as a React component.
 *
 * @param props - The data and args which are used to render the chart.
 */
function XYChart({ data, args }: { data: Datatable; args: XYArgs }) {
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
