/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expression.scss';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import ReactDOM from 'react-dom';
import { IUiSettingsClient, ThemeServiceStart } from 'kibana/public';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';
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
import { getContrastColor } from '../shared_components';
import { EmptyPlaceholder } from '../../../../../src/plugins/charts/public';
import { LensIconChartMetric } from '../assets/chart_metric';
import type { FormatFactory } from '../../common';
import type { MetricChartProps } from '../../common/expressions';
export type { MetricChartProps, MetricState, MetricConfig } from '../../common/expressions';

export const getMetricChartRenderer = (
  formatFactory: FormatFactory,
  uiSettings: IUiSettingsClient,
  theme: ThemeServiceStart
): ExpressionRenderDefinition<MetricChartProps> => ({
  name: 'lens_metric_chart_renderer',
  displayName: 'Metric chart',
  help: 'Metric chart renderer',
  validate: () => undefined,
  reuseDomNode: true,
  render: (domNode: Element, config: MetricChartProps, handlers: IInterpreterRenderHandlers) => {
    ReactDOM.render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <MetricChart {...config} formatFactory={formatFactory} uiSettings={uiSettings} />
        </I18nProvider>
      </KibanaThemeProvider>,
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

  const { rangeMin, rangeMax, stops, colors } = palette.params;

  if (value > rangeMax) {
    return {};
  }
  if (value < rangeMin) {
    return {};
  }
  const cssProp = colorMode === ColorMode.Background ? 'backgroundColor' : 'color';
  let rawIndex = stops.findIndex((v) => v > value);

  if (!isFinite(rangeMax) && value > stops[stops.length - 1]) {
    rawIndex = stops.length - 1;
  }

  // in this case first stop is -Infinity
  if (!isFinite(rangeMin) && value < (isFinite(stops[0]) ? stops[0] : stops[1])) {
    rawIndex = 0;
  }

  const colorIndex = rawIndex;

  const color = colors[colorIndex];
  const styling = {
    [cssProp]: color,
  };
  if (colorMode === ColorMode.Background && color) {
    // set to "euiTextColor" for both light and dark color, depending on the theme
    styling.color = getContrastColor(color, isDarkTheme, 'euiTextColor', 'euiTextColor');
  }
  return styling;
}

export function MetricChart({
  data,
  args,
  formatFactory,
  uiSettings,
}: MetricChartProps & { formatFactory: FormatFactory; uiSettings: IUiSettingsClient }) {
  const { metricTitle, accessor, mode, colorMode, palette } = args;
  const firstTable = Object.values(data.tables)[0];

  const getEmptyState = () => (
    <VisualizationContainer className="lnsMetricExpression__container">
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
  const rawValue = row[accessor];

  // NOTE: Cardinality and Sum never receives "null" as value, but always 0, even for empty dataset.
  // Mind falsy values here as 0!
  if (!['number', 'string'].includes(typeof rawValue)) {
    return getEmptyState();
  }

  const value =
    column && column.meta?.params
      ? formatFactory(column.meta?.params).convert(rawValue)
      : Number(Number(rawValue).toFixed(3)).toString();

  const color = getColorStyling(rawValue, colorMode, palette, uiSettings.get('theme:darkMode'));

  return (
    <VisualizationContainer className="lnsMetricExpression__container" style={color}>
      <AutoScale key={value}>
        <div data-test-subj="lns_metric_value" className="lnsMetricExpression__value">
          {value}
        </div>
        {mode === 'full' && (
          <div
            data-test-subj="lns_metric_title"
            className="lnsMetricExpression__title"
            style={colorMode === ColorMode.Background ? color : undefined}
          >
            {metricTitle}
          </div>
        )}
      </AutoScale>
    </VisualizationContainer>
  );
}
