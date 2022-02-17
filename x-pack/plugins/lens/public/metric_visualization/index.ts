/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'kibana/public';
import type { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import type { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import type { EditorFrameSetup } from '../types';
import type { FormatFactory } from '../../common';

export interface MetricVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class MetricVisualization {
  setup(
    core: CoreSetup,
    { expressions, formatFactory, editorFrame, charts }: MetricVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const { getMetricVisualization, getMetricChartRenderer } = await import('../async_services');
      const palettes = await charts.palettes.getPalettes();

      expressions.registerRenderer(() =>
        getMetricChartRenderer(formatFactory, core.uiSettings, core.theme)
      );
      return getMetricVisualization({ paletteService: palettes, theme: core.theme });
    });
  }
}
