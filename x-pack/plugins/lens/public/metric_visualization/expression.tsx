/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expression.scss';
import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import ReactDOM from 'react-dom';
import type {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '../../../../../src/plugins/expressions/public';
import { AutoScale } from './auto_scale';
import { VisualizationContainer } from '../visualization_container';
import { EmptyPlaceholder } from '../shared_components';
import { LensIconChartMetric } from '../assets/chart_metric';
import type { FormatFactory } from '../../common';
import type { MetricChartProps } from '../../common/expressions';
export type { MetricChartProps, MetricState, MetricConfig } from '../../common/expressions';

export const getMetricChartRenderer = (
  formatFactory: FormatFactory
): ExpressionRenderDefinition<MetricChartProps> => ({
  name: 'lens_metric_chart_renderer',
  displayName: 'Metric chart',
  help: 'Metric chart renderer',
  validate: () => undefined,
  reuseDomNode: true,
  render: (domNode: Element, config: MetricChartProps, handlers: IInterpreterRenderHandlers) => {
    ReactDOM.render(
      <I18nProvider>
        <MetricChart {...config} formatFactory={formatFactory} />
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

  const getEmptyState = () => (
    <VisualizationContainer
      reportTitle={title}
      reportDescription={description}
      className="lnsMetricExpression__container"
    >
      <EmptyPlaceholder icon={LensIconChartMetric} />
    </VisualizationContainer>
  );

  if (!accessor || !firstTable) {
    return getEmptyState();
  }

  const column = firstTable.columns.find(({ id }) => id === accessor);
  const row = firstTable.rows[0];
  if (!column || !row) {
    return getEmptyState();
  }

  // NOTE: Cardinality and Sum never receives "null" as value, but always 0, even for empty dataset.
  // Mind falsy values here as 0!
  const shouldShowResults = row[accessor] != null;
  if (!shouldShowResults) {
    return getEmptyState();
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
