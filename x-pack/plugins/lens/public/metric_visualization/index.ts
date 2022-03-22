/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'kibana/public';
import type { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import type { EditorFrameSetup } from '../types';

export interface MetricVisualizationPluginSetupPlugins {
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class MetricVisualization {
  setup(core: CoreSetup, { editorFrame, charts }: MetricVisualizationPluginSetupPlugins) {
    editorFrame.registerVisualization(async () => {
      const { getMetricVisualization } = await import('../async_services');
      const palettes = await charts.palettes.getPalettes();

      return getMetricVisualization({ paletteService: palettes, theme: core.theme });
    });
  }
}
