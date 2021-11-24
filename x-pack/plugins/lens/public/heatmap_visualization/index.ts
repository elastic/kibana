/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'kibana/public';
import type { EditorFrameSetup } from '../types';
import type { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';

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
