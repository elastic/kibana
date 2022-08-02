/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { EditorFrameSetup } from '../types';

export interface PieVisualizationPluginSetupPlugins {
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export interface PieVisualizationPluginStartPlugins {
  uiActions: UiActionsStart;
}

export class PieVisualization {
  setup(core: CoreSetup, { editorFrame, charts }: PieVisualizationPluginSetupPlugins) {
    editorFrame.registerVisualization(async () => {
      const { getPieVisualization } = await import('../async_services');
      const palettes = await charts.palettes.getPalettes();

      return getPieVisualization({ paletteService: palettes, kibanaTheme: core.theme });
    });
  }
}
