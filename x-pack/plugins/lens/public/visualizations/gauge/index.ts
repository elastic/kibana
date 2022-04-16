/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { EditorFrameSetup } from '../../types';
import { transparentizePalettes } from './palette_config';

export interface GaugeVisualizationPluginSetupPlugins {
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class GaugeVisualization {
  setup(core: CoreSetup, { editorFrame, charts }: GaugeVisualizationPluginSetupPlugins) {
    editorFrame.registerVisualization(async () => {
      const { getGaugeVisualization } = await import('../../async_services');
      const palettes = transparentizePalettes(await charts.palettes.getPalettes());
      return getGaugeVisualization({ paletteService: palettes });
    });
  }
}
