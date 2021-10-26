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
import { IUiSettingsClient } from 'kibana/public';
import type {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '../../../../../src/plugins/expressions/public';
import {
  ColorMode,
  CustomPaletteState,
  PaletteOutput,
} from '../../../../../src/plugins/charts/public';
import { AutoScale } from './auto_scale';
import { VisualizationContainer } from '../visualization_container';
import { EmptyPlaceholder, getContrastColor } from '../shared_components';
import { LensIconChartMetric } from '../assets/chart_metric';
import type { FormatFactory } from '../../common';
import type { MetricChartProps } from '../../common/expressions';
export type { MetricChartProps, MetricState, MetricConfig } from '../../common/expressions';

export const getMetricChartRenderer = (
  formatFactory: FormatFactory,
  uiSettings: IUiSettingsClient
): ExpressionRenderDefinition<MetricChartProps> => ({
  name: 'lens_metric_chart_renderer',
  displayName: 'Metric chart',
  help: 'Metric chart renderer',
  validate: () => undefined,
  reuseDomNode: true,
  render: (domNode: Element, config: MetricChartProps, handlers: IInterpreterRenderHandlers) => {
    ReactDOM.render(
      <I18nProvider>
        <MetricChart {...config} formatFactory={formatFactory} uiSettings={uiSettings} />
      </I18nProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

function getColorStyling(
  value: number,
  colorMode: ColorMode,
  palette: PaletteOutput<CustomPaletteState> | undefined,
  isDarkTheme: boolean
) {
  if (
    colorMode === ColorMode.None ||
    !palette?.params ||
    !palette?.params.colors?.length ||
    isNaN(value)
  ) {
    return {};
  }
  const cssProp = colorMode === ColorMode.Background ? 'backgroundColor' : 'color';
  // if no stops are defined, just pick the color in the middle
  const colorIndex = palette.params.stops.length
    ? Math.max(
        0,
        palette.params.stops.findIndex((v) => v > value)
      )
    : Math.floor(palette.params.colors.length / 2);

  const color = palette.params.colors[colorIndex];
  const styling = {
    [cssProp]: color,
  };
  if (colorMode === ColorMode.Background && color) {
    styling.color = getContrastColor(color, isDarkTheme);
  }
  return styling;
}

export function MetricChart({
  data,
  args,
  formatFactory,
  uiSettings,
}: MetricChartProps & { formatFactory: FormatFactory; uiSettings: IUiSettingsClient }) {
  const { metricTitle, title, description, accessor, mode, colorMode, palette } = args;
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
  const rawValue = row[accessor] as number | undefined;

  // NOTE: Cardinality and Sum never receives "null" as value, but always 0, even for empty dataset.
  // Mind falsy values here as 0!
  if (rawValue == null) {
    return getEmptyState();
  }

  const value =
    column && column.meta?.params
      ? formatFactory(column.meta?.params).convert(rawValue)
      : Number(Number(rawValue).toFixed(3)).toString();

  const color = getColorStyling(rawValue, colorMode, palette, uiSettings.get('theme:darkMode'));

  return (
    <VisualizationContainer
      reportTitle={title}
      reportDescription={description}
      className="lnsMetricExpression__container"
    >
      <AutoScale key={value}>
        <div
          data-test-subj="lns_metric_value"
          style={{ fontSize: '60pt', fontWeight: 600, ...color }}
        >
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
