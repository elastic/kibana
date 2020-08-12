/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {
  ExpressionFunctionDefinition,
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '../../../../../src/plugins/expressions/public';
import { ExampleConfig } from './types';
import { FormatFactory, LensMultiTable } from '../types';
import { AutoScale } from './auto_scale';
import { VisualizationContainer } from '../visualization_container';

// The expression render configuration
export interface ExampleChartProps {
  data: LensMultiTable;
  args: ExampleConfig;
}

// The example expression function's return value.
export interface ExampleRender {
  type: 'render';
  as: 'lens_example_chart_renderer';
  value: ExampleChartProps;
}

// This is the expression function which takes the saved configuration + the
// data returned from Elastic, and tells the expression to render the metric
// chart renderer. This is basically boilerplate that is required due to the
// fact that Lens / embeddables were built on top of Kibana's expressions.

export const exampleChart: ExpressionFunctionDefinition<
  'lens_example_chart',
  LensMultiTable,
  Omit<ExampleConfig, 'layerId'>,
  ExampleRender
> = {
  name: 'lens_example_chart',
  type: 'render',
  help: 'An example metric chart',
  args: {
    title: {
      types: ['string'],
      help: 'The chart title.',
    },
    accessor: {
      types: ['string'],
      help: 'The column whose value is being displayed',
    },
    mode: {
      types: ['string'],
      options: ['reduced', 'full'],
      default: 'full',
      help:
        'The display mode of the chart - reduced will only show the metric itself without min size',
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data, args) {
    return {
      type: 'render',
      as: 'lens_example_chart_renderer',
      value: {
        data,
        args,
      },
    } as ExampleRender;
  },
};

// This is the expression renderer which was is invoked as a result of
// the lens_example_chart function (above) being called in an expression.
// It's job is to render the metric visualization. (More boilerplate.)

export const getExampleChartRenderer = (
  formatFactory: Promise<FormatFactory>
): ExpressionRenderDefinition<ExampleChartProps> => ({
  name: 'lens_example_chart_renderer',
  displayName: 'Example Metric chart',
  help: 'Example metric chart renderer',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: ExampleChartProps,
    handlers: IInterpreterRenderHandlers
  ) => {
    const resolvedFormatFactory = await formatFactory;
    ReactDOM.render(
      <ExampleChart {...config} formatFactory={resolvedFormatFactory} />,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

/**
 * The *actual* render logic for rendering our visualization.
 *
 * data = the data returned from Elastic search, which we are rendering
 * args = the metric chart configuration passed in from the expression
 * formatFactory = the formatter we'll use to format any data we display
 */
export function ExampleChart({
  data,
  args,
  formatFactory,
}: ExampleChartProps & { formatFactory: FormatFactory }) {
  const { title, accessor, mode } = args;
  let value = '-';
  const firstTable = Object.values(data.tables)[0];
  if (!accessor) {
    return (
      <VisualizationContainer reportTitle={title} className="lnsMetricExpression__container" />
    );
  }

  if (firstTable) {
    const column = firstTable.columns[0];
    const row = firstTable.rows[0];
    if (row[accessor]) {
      value =
        column && column.formatHint
          ? formatFactory(column.formatHint).convert(row[accessor])
          : Number(Number(row[accessor]).toFixed(3)).toString();
    }
  }

  return (
    <VisualizationContainer reportTitle={title} className="lnsMetricExpression__container">
      <AutoScale>
        <div
          data-test-subj="lns_metric_value"
          style={{ fontSize: '60pt', fontWeight: 600, color: 'blue' }}
        >
          {value}
        </div>
        {mode === 'full' && (
          <div data-test-subj="lns_metric_title" style={{ fontSize: '24pt', color: 'pink' }}>
            {title}
          </div>
        )}
      </AutoScale>
    </VisualizationContainer>
  );
}
