/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import { ChartsPluginSetup } from 'src/plugins/charts/public';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import { EditorFrameSetup, FormatFactory } from '../types';

export interface GaugeVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: Promise<FormatFactory>;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class GaugeVisualization {
  constructor() {}

  setup(
    _core: CoreSetup | null,
    { expressions, formatFactory, editorFrame, charts }: GaugeVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const { getGaugeVisualization, gaugeChart, getGaugeChartRenderer } = await import(
        '../async_services'
      );
      const palettes = await charts.palettes.getPalettes();

      expressions.registerFunction(() => gaugeChart);

      expressions.registerRenderer(() => getGaugeChartRenderer(formatFactory));
      return getGaugeVisualization(palettes);
    });
  }
}
