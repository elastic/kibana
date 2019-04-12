/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// register all the stuff which the pipeline needs later

import '@elastic/charts/dist/style.css';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
    name: 'metric_chart',
    type: 'render',
    args: {
      title: {
        types: ['string'],
      },
    },
    context: { types: ['kibana_datatable'] },
    fn(context: any, args: any) {
      const data: any[][] = context.rows.map((row: any) => {
        const column = context.columns[0];
        return {
          [column.id]: column.type === 'date' ? moment(row[column.id]).valueOf() : row[column.id],
        };
      });

      return {
        type: 'render',
        as: 'metric_chart_renderer',
        value: {
          title: args.title,
          data,
        },
      };
    },
  };
}

function MetricChart(props: any) {
  const config = props.config;

  return (
    <EuiFlexGroup
      justifyContent="center"
      alignItems="center"
      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
    >
      <EuiFlexItem grow={false}>
        <h2>{config.title}</h2>
        {config.data.flatMap((metricRow: object) =>
          Object.values(metricRow).map(metric => <div>{metric}</div>)
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function sampleVisRenderer() {
  return {
    name: 'metric_chart_renderer',
    displayName: 'Metric Chart',
    reuseDomNode: true,
    render: async (domNode: HTMLDivElement, config: any, handlers: any) => {
      ReactDOM.render(<MetricChart config={config} />, domNode);
    },
  };
}

export const registerPipeline = (registries: any) => {
  register(registries, {
    browserFunctions: [sampleVisFunction],
    renderers: [sampleVisRenderer],
  });
};
