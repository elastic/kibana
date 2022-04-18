/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { EditorFrameSetup } from '../types';

export interface HeatmapVisualizationPluginSetupPlugins {
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class HeatmapVisualization {
  setup(core: CoreSetup, { editorFrame, charts }: HeatmapVisualizationPluginSetupPlugins) {
    editorFrame.registerVisualization(async () => {
      const { getHeatmapVisualization } = await import('../async_services');
      const palettes = await charts.palettes.getPalettes();

      return getHeatmapVisualization({ paletteService: palettes, theme: core.theme });
    });
  }
}
