/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

import {
  AreaSeries,
  Axis,
  Chart,
  getAxisId,
  getSpecId,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  TooltipType,
} from '@elastic/charts';
import '@elastic/charts/dist/style.css';
// @ts-ignore
import { register } from '@kbn/interpreter/common';
import moment from 'moment';
import React from 'react';
import * as ReactDOM from 'react-dom';

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
    fn(context: any, args: any) {
      const xColumn = context.columns[0].id;
      const xColumnType = context.columns[0].type;
      const yColumn = context.columns[1].id;

      return {
        type: 'render',
        as: 'xy_chart_renderer',
        value: {
          // TODO this should come via the expression
          title: 'A title',
          seriesType: args.displayType,
          xAxisName: xColumn,
          yAxisName: yColumn,
          xAxisType:
            context.columns[0].type === 'string'
              ? 'ordinal'
              : context.columns[0].type === 'number'
              ? 'linear'
              : 'time',
          data: context.rows.map((row: any) => [
            xColumnType === 'date' ? moment(row[xColumn]).valueOf() : row[xColumn],
            row[yColumn],
          ]),
          showAxes: !args.hideAxes,
          hideTooltips: args.hideTooltips,
        } as XyChartConfig,
      };
    },
  };
}

interface XyChartConfig {
  title: string;
  seriesType: 'line' | 'area';
  xAxisName: string;
  yAxisName: string;
  xAxisType: 'ordinal' | 'linear' | 'time';
  data: Array<Array<string | number>>;
  showAxes: boolean;
  hideTooltips: boolean;
}

function getXScaleType(xAxisType: string) {
  if (xAxisType === 'time') {
    return ScaleType.Time;
  }
  if (xAxisType === 'linear') {
    return ScaleType.Linear;
  }
  return ScaleType.Ordinal;
}

function XyChart(props: { config: XyChartConfig }) {
  const config = props.config;
  return (
    <Chart renderer="canvas">
      {config.hideTooltips && <Settings tooltipType={TooltipType.None} />}
      {config.showAxes && (
        <>
          <Axis
            id={getAxisId('bottom')}
            title={config.xAxisName}
            position={Position.Bottom}
            showOverlappingTicks={true}
          />
          <Axis
            id={getAxisId('left')}
            title={config.yAxisName}
            position={Position.Left}
            tickFormat={d => Number(d).toFixed(2)}
          />
        </>
      )}

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
