/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './expression.scss';
import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  ExpressionFunctionDefinition,
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '../../../../../src/plugins/expressions/public';
import { MetricConfig } from './types';
import { FormatFactory, LensMultiTable } from '../types';
import { AutoScale } from './auto_scale';
import { VisualizationContainer } from '../visualization_container';
import { EmptyPlaceholder } from '../shared_components';
import { LensIconChartMetric } from '../assets/chart_metric';

export interface MetricChartProps {
  data: LensMultiTable;
  args: MetricConfig;
}

export interface MetricRender {
  type: 'render';
  as: 'lens_metric_chart_renderer';
  value: MetricChartProps;
}

export const metricChart: ExpressionFunctionDefinition<
  'lens_metric_chart',
  LensMultiTable,
  Omit<MetricConfig, 'layerId'>,
  MetricRender
> = {
  name: 'lens_metric_chart',
  type: 'render',
  help: 'A metric chart',
  args: {
    title: {
      types: ['string'],
      help: 'The chart title.',
    },
    description: {
      types: ['string'],
      help: '',
    },
    metricTitle: {
      types: ['string'],
      help: 'The title of the metric shown.',
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
      as: 'lens_metric_chart_renderer',
      value: {
        data,
        args,
      },
    } as MetricRender;
  },
};

export const getMetricChartRenderer = (
  formatFactory: Promise<FormatFactory>
): ExpressionRenderDefinition<MetricChartProps> => ({
  name: 'lens_metric_chart_renderer',
  displayName: 'Metric chart',
  help: 'Metric chart renderer',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: MetricChartProps,
    handlers: IInterpreterRenderHandlers
  ) => {
    const resolvedFormatFactory = await formatFactory;
    ReactDOM.render(
      <I18nProvider>
        <MetricChart {...config} formatFactory={resolvedFormatFactory} />
      </I18nProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

export function MetricChart({
  data,
  args,
  formatFactory,
}: MetricChartProps & { formatFactory: FormatFactory }) {
  const { metricTitle, title, description, accessor, mode } = args;
  const firstTable = Object.values(data.tables)[0];
  if (!accessor) {
    return (
      <VisualizationContainer
        reportTitle={title}
        reportDescription={description}
        className="lnsMetricExpression__container"
      />
    );
  }

  if (!firstTable) {
    return <EmptyPlaceholder icon={LensIconChartMetric} />;
  }

  const column = firstTable.columns[0];
  const row = firstTable.rows[0];

  // NOTE: Cardinality and Sum never receives "null" as value, but always 0, even for empty dataset.
  // Mind falsy values here as 0!
  const shouldShowResults = row[accessor] != null;

  if (!shouldShowResults) {
    return <EmptyPlaceholder icon={LensIconChartMetric} />;
  }

  const value =
    column && column.meta?.params
      ? formatFactory(column.meta?.params).convert(row[accessor])
      : Number(Number(row[accessor]).toFixed(3)).toString();

  return (
    <VisualizationContainer
      reportTitle={title}
      reportDescription={description}
      className="lnsMetricExpression__container"
    >
      <AutoScale>
        <div data-test-subj="lns_metric_value" style={{ fontSize: '60pt', fontWeight: 600 }}>
          {value}
        </div>
        {mode === 'full' && (
          <div data-test-subj="lns_metric_title" style={{ fontSize: '24pt' }}>
            {metricTitle}
          </div>
        )}
      </AutoScale>
    </VisualizationContainer>
  );
}
