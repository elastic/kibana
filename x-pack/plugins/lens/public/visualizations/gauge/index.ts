/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'kibana/public';
import type { EditorFrameSetup } from '../../types';
import type { ChartsPluginSetup } from '../../../../../../src/plugins/charts/public';
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
