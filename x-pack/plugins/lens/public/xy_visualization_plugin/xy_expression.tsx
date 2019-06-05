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
import {
  ExpressionFunction,
  ArgumentType,
} from '../../../../../src/legacy/core_plugins/interpreter/public';
import { KibanaDatatable } from '../types';
import { RenderFunction } from './plugin';

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

type LegendConfigResult = LegendConfig & { type: 'lens_xy_legendConfig' };

export const legendConfig: ExpressionFunction<
  'lens_xy_legendConfig',
  null,
  LegendConfig,
  LegendConfigResult
> = {
  name: 'lens_xy_legendConfig',
  aliases: [],
  type: 'lens_xy_legendConfig',
  help: `Configure the xy chart's legend`,
  context: {
    types: ['null'],
  },
  args: {
    isVisible: {
      types: ['boolean'],
      help: 'Specifies whether or not the legend is visible.',
    },
    position: {
      types: ['string'],
      options: [Position.Top, Position.Right, Position.Bottom, Position.Left],
      help: 'Specifies the legend position.',
    },
  },
  fn: function fn(_context: unknown, args: LegendConfig) {
    return {
      type: 'lens_xy_legendConfig',
      ...args,
    };
  },
};

interface AxisConfig {
  title: string;
  showGridlines: boolean;
  position: Position;
}

const axisConfig: { [key in keyof AxisConfig]: ArgumentType<AxisConfig[key]> } = {
  title: {
    types: ['string'],
    help: 'The axis title',
  },
  showGridlines: {
    types: ['boolean'],
    help: 'Show / hide axis grid lines.',
  },
  position: {
    types: ['string'],
    options: [Position.Top, Position.Right, Position.Bottom, Position.Left],
    help: 'The position of the axis',
  },
};

export interface YConfig extends AxisConfig {
  accessors: string[];
}

type YConfigResult = YConfig & { type: 'lens_xy_yConfig' };

export const yConfig: ExpressionFunction<'lens_xy_yConfig', null, YConfig, YConfigResult> = {
  name: 'lens_xy_yConfig',
  aliases: [],
  type: 'lens_xy_yConfig',
  help: `Configure the xy chart's y axis`,
  context: {
    types: ['null'],
  },
  args: {
    ...axisConfig,
    accessors: {
      types: ['string'],
      help: 'The columns to display on the y axis.',
      multi: true,
    },
  },
  fn: function fn(_context: unknown, args: YConfig) {
    return {
      type: 'lens_xy_yConfig',
      ...args,
    };
  },
};

export interface XConfig extends AxisConfig {
  accessor: string;
}

type XConfigResult = XConfig & { type: 'lens_xy_xConfig' };

export const xConfig: ExpressionFunction<'lens_xy_xConfig', null, XConfig, XConfigResult> = {
  name: 'lens_xy_xConfig',
  aliases: [],
  type: 'lens_xy_xConfig',
  help: `Configure the xy chart's x axis`,
  context: {
    types: ['null'],
  },
  args: {
    ...axisConfig,
    accessor: {
      types: ['string'],
      help: 'The column to display on the x axis.',
    },
  },
  fn: function fn(_context: unknown, args: XConfig) {
    return {
      type: 'lens_xy_xConfig',
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

export interface XYRender {
  type: 'render';
  as: 'lens_xy_chart_renderer';
  value: XYChartProps;
}

export const xyChart: ExpressionFunction<'lens_xy_chart', KibanaDatatable, XYArgs, XYRender> = ({
  name: 'lens_xy_chart',
  type: 'render',
  help: 'An X/Y chart',
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
  // TODO the typings currently don't support custom type args. As soon as they do, this can be removed
} as unknown) as ExpressionFunction<'lens_xy_chart', KibanaDatatable, XYArgs, XYRender>;

export const xyChartRenderer: RenderFunction<XYChartProps> = {
  name: 'lens_xy_chart_renderer',
  displayName: 'XY Chart',
  help: 'X/Y Chart Renderer',
  validate: () => {},
  reuseDomNode: true,
  render: async (domNode: Element, config: XYChartProps, _handlers: unknown) => {
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
