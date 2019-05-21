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
  CurveType,
  AreaSeries,
  BarSeries,
} from '@elastic/charts';
import { Datatable } from '../../../canvas/canvas_plugin_src/functions/types';

/**
 * This file contains the xy chart expression function and renderer.
 */

const chartName = 'xy_chart';
const rendererName = `${chartName}_renderer`;

export interface LegendConfig {
  isVisible: boolean;
  position: Position;
}

interface AxisConfig {
  title: string;
  showGridlines: boolean;
  position: Position;
}

interface YConfig extends AxisConfig {
  columns: string[];
}

interface XConfig extends AxisConfig {
  column: string;
}

interface XYArgs {
  seriesType: 'bar' | 'line' | 'area';
  title: string;
  legend: LegendConfig;
  y: YConfig;
  x: XConfig;
  splitBy: string[];
  stackBy: string[];
}

const axisConfig = {
  title: { types: ['string'] },
  showGridlines: { types: ['boolean'] },
  position: { types: ['string'] },
};

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
    column: { types: ['string'] },
  },
  fn: function fn(_context: any, args: LegendConfig) {
    return {
      type: 'xConfig',
      ...args,
    };
  },
};

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
    columns: {
      types: ['string'],
      multi: true,
    },
  },
  fn: function fn(_context: any, args: LegendConfig) {
    return {
      type: 'yConfig',
      ...args,
    };
  },
};

export const xyFunction = {
  name: chartName,
  type: 'render',
  args: {
    title: { types: ['string'] },
    seriesType: { types: ['string'] },
    legend: { types: ['legendConfig'] },
    y: { types: ['yConfig'] },
    x: { types: ['xConfig'] },
    splitBy: {
      types: ['string'],
      multi: true,
    },
    stackBy: {
      types: ['string'],
      multi: true,
    },
  },
  context: { types: ['kibana_datatable'] },
  fn(data: Datatable, args: XYArgs) {
    return {
      type: 'render',
      as: rendererName,
      value: {
        data,
        args,
      },
    };
  },
};

export function xyRenderer() {
  return {
    name: rendererName,
    displayName: 'XY Chart',
    reuseDomNode: true,
    render: async (domNode: HTMLDivElement, config: any, _handlers: any) => {
      ReactDOM.render(<XyChart {...config} />, domNode);
    },
  };
}

export function XyChart({ data, args }: { data: Datatable; args: XYArgs }) {
  const { legend, x, y, splitBy, stackBy, seriesType } = args;
  const seriesProps = {
    id: getSpecId(y.columns.join(',')),
    xAccessor: x.column,
    yAccessors: y.columns,
    splitSeriesAccessors: splitBy,
    stackAccessors: stackBy,
    data: data.rows,
    yScaleToDataExtent: false,
    curve: CurveType.CURVE_CATMULL_ROM,
  };

  return (
    <Chart className="story-chart">
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
