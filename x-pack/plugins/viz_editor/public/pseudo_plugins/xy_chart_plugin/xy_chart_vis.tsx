/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

// @ts-ignore
import { register } from '@kbn/interpreter/common';
import moment from 'moment';
import React from 'react';
import * as ReactDOM from 'react-dom';

// @ts-ignore
import { XyChart } from './xy_chart';

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
        },
      };
    },
  };
}

function sampleVisRenderer() {
  return {
    name: 'xy_chart_renderer',
    displayName: 'XY Chart',
    reuseDomNode: true,
    render: async (domNode: HTMLDivElement, config: any, handlers: any) => {
      domNode.style.position = 'relative';
      domNode.style.height = '500px';
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
