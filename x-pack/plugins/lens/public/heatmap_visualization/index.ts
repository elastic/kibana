/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import { EditorFrameSetup, FormatFactory } from '../types';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import { getTimeZone } from '../utils';

export interface HeatmapVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: Promise<FormatFactory>;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class HeatmapVisualization {
  constructor() {}

  setup(
    core: CoreSetup,
    { expressions, formatFactory, editorFrame, charts }: HeatmapVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const timeZone = getTimeZone(core.uiSettings);

      const {
        getHeatmapVisualization,
        heatmap,
        heatmapLegendConfig,
        heatmapGridConfig,
        getHeatmapRenderer,
      } = await import('../async_services');
      const palettes = await charts.palettes.getPalettes();

      expressions.registerFunction(() => heatmap);
      expressions.registerFunction(() => heatmapLegendConfig);
      expressions.registerFunction(() => heatmapGridConfig);

      expressions.registerRenderer(
        getHeatmapRenderer({
          formatFactory,
          chartsThemeService: charts.theme,
          paletteService: palettes,
          timeZone,
        })
      );
      return getHeatmapVisualization({ paletteService: palettes });
    });
  }
}
