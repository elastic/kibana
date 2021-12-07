/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'kibana/public';
import type { ExpressionsSetup } from '../../../../../../src/plugins/expressions/public';
import type { EditorFrameSetup } from '../../types';
import type { ChartsPluginSetup } from '../../../../../../src/plugins/charts/public';
import type { FormatFactory } from '../../../common';
import { transparentizePalettes } from './utils';

export interface GaugeVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class GaugeVisualization {
  setup(
    core: CoreSetup,
    { expressions, formatFactory, editorFrame, charts }: GaugeVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const { getGaugeVisualization, getGaugeRenderer } = await import('../../async_services');
      const palettes = transparentizePalettes(await charts.palettes.getPalettes());

      expressions.registerRenderer(
        getGaugeRenderer({
          formatFactory,
          chartsThemeService: charts.theme,
          paletteService: palettes,
        })
      );
      return getGaugeVisualization({ paletteService: palettes });
    });
  }
}
