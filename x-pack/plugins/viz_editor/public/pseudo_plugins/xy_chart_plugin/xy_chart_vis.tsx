/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

import {
  AreaSeries,
  Axis,
  BarSeries,
  Chart,
  getAxisId,
  getSpecId,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  timeFormatter,
  TooltipType,
  CurveType,
} from '@elastic/charts';
import '@elastic/charts/dist/style.css';
// @ts-ignore
import { register } from '@kbn/interpreter/common';
import moment from 'moment';
import React from 'react';
import * as ReactDOM from 'react-dom';
import { SETTINGS, gridVerticalSettings, gridHorizontalSettings } from './chart_settings';

type XScaleTypes = ScaleType.Ordinal | ScaleType.Linear | ScaleType.Time;

function xAxisScale({ type }: { type: string }): XScaleTypes {
  switch (type) {
    case 'string':
    case 'boolean':
      return ScaleType.Ordinal;
    case 'number':
      return ScaleType.Linear;
  }
  return ScaleType.Time;
}

// This simply registers a pipeline function and a pipeline renderer to the global pipeline
// context. It will be used by the editor config which is shipped in the same plugin, but
// it could also be used from somewhere else.

function sampleVisFunction() {
  return {
    name: 'xy_chart',
    type: 'render',
    args: {
      displayType: {
        types: ['string'],
      },
      stacked: {
        types: ['boolean'],
      },
      hideAxes: {
        types: ['boolean'],
        default: false,
      },
      hideTooltips: {
        types: ['boolean'],
        default: false,
      },
    },
    context: { types: ['kibana_datatable'] },
    fn(context: { rows: any[]; columns: any[] }, args: any) {
      if (context.columns.length <= 1) {
        // Can't render an XY chart without two columns
        return;
      }

      // X is always the last column for an XY because of bucketing
      const xColumn = context.columns[context.columns.length - 1];
      const yColumn = context.columns[context.columns.length - 2];
      // Other columns can be empty
      const otherColumns = context.columns.slice(0, context.columns.length - 2);

      const data: any[][] = context.rows.map((row: any) => {
        return {
          ...row,
          [yColumn.id]:
            yColumn.type === 'date' ? moment(row[yColumn.id] as any).valueOf() : row[yColumn.id],
          [xColumn.id]:
            xColumn.type === 'date' ? moment(row[xColumn.id] as any).valueOf() : row[xColumn.id],
        };
      });

      return {
        type: 'render',
        as: 'xy_chart_renderer',
        value: {
          title: 'A title',
          seriesType: args.displayType,
          stacked: args.stacked,
          showAxes: !args.hideAxes,
          hideTooltips: args.hideTooltips,

          xAxisName: xColumn.name,
          yAxisName: yColumn.name,

          xAccessor: xColumn.id,
          yAccessors: [yColumn.id],
          splitSeriesAccessors: otherColumns.map((col: any) => col.id),
          xAxisType: xAxisScale(xColumn),
          data,
        },
      };
    },
  };
}

interface XyChartConfig {
  title: string;
  seriesType: 'line' | 'area' | 'bar';
  stacked: boolean;
  xAxisName: string;
  yAxisName: string;
  xAxisType: XScaleTypes;

  xAccessor: string;
  yAccessors: string[];
  splitSeriesAccessors: string[];

  data: Array<Array<string | number>>;
  showAxes: boolean;
  hideTooltips: boolean;
}

function getFormatterFunction(type: ScaleType) {
  if (type === ScaleType.Time) {
    return timeFormatter('DD');
  }
  return (input: any) => input;
}

function XyChart(props: { config: XyChartConfig }) {
  const config = props.config;

  const key = config.yAccessors.concat([config.xAccessor]).join(',');

  return (
    <Chart renderer="canvas" key={key}>
      <Settings
        {...SETTINGS}
        showLegend={!config.hideTooltips && config.splitSeriesAccessors.length > 0}
        legendPosition={Position.Right}
        tooltipType={config.hideTooltips ? TooltipType.None : TooltipType.VerticalCursor}
        animateData={false}
      />
      {config.showAxes && (
        <>
          <Axis
            id={getAxisId('bottom')}
            title={config.xAxisName}
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={getFormatterFunction(config.xAxisType)}
            showGridLines
            gridLineStyle={gridVerticalSettings}
          />
          <Axis
            id={getAxisId('left')}
            title={config.yAxisName}
            position={Position.Left}
            tickFormat={d => String(Math.floor(Number(d)))}
            showGridLines
            gridLineStyle={gridHorizontalSettings}
          />
        </>
      )}
      {config.seriesType === 'line' && (
        <LineSeries
          id={getSpecId(config.yAccessors.join(','))}
          xScaleType={config.xAxisType}
          yScaleType={ScaleType.Linear}
          xAccessor={config.xAccessor}
          yAccessors={config.yAccessors}
          splitSeriesAccessors={config.splitSeriesAccessors}
          stackAccessors={config.stacked ? [config.xAccessor] : []}
          data={config.data}
          yScaleToDataExtent={false}
          curve={CurveType.CURVE_CATMULL_ROM}
        />
      )}
      {config.seriesType === 'area' && (
        <AreaSeries
          id={getSpecId(config.yAccessors.join(','))}
          xScaleType={config.xAxisType}
          yScaleType={ScaleType.Linear}
          xAccessor={config.xAccessor}
          yAccessors={config.yAccessors}
          splitSeriesAccessors={config.splitSeriesAccessors}
          stackAccessors={config.stacked ? [config.xAccessor] : []}
          data={config.data}
          yScaleToDataExtent={false}
          curve={CurveType.CURVE_CATMULL_ROM}
        />
      )}
      {config.seriesType === 'bar' && (
        <BarSeries
          id={getSpecId(config.yAccessors.join(','))}
          xScaleType={config.xAxisType}
          yScaleType={ScaleType.Linear}
          xAccessor={config.xAccessor}
          yAccessors={config.yAccessors}
          splitSeriesAccessors={config.splitSeriesAccessors}
          stackAccessors={config.stacked ? [config.xAccessor] : []}
          data={config.data}
          yScaleToDataExtent={false}
        />
      )}
    </Chart>
  );
}

function sampleVisRenderer() {
  return {
    name: 'xy_chart_renderer',
    displayName: 'XY Chart',
    reuseDomNode: true,
    render: async (domNode: HTMLDivElement, config: any, handlers: any) => {
      ReactDOM.render(<XyChart config={config} />, domNode);
    },
  };
}

export const registerPipeline = (registries: any) => {
  register(registries, {
    browserFunctions: [sampleVisFunction],
    renderers: [sampleVisRenderer],
  });
};
