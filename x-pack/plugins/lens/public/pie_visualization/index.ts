/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'src/core/public';
import { ExpressionsSetup } from 'src/plugins/expressions/public';
import { EditorFrameSetup, FormatFactory } from '../types';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';

export interface PieVisualizationPluginSetupPlugins {
  editorFrame: EditorFrameSetup;
  expressions: ExpressionsSetup;
  formatFactory: Promise<FormatFactory>;
  charts: ChartsPluginSetup;
}

export interface PieVisualizationPluginStartPlugins {
  uiActions: UiActionsStart;
}

export class PieVisualization {
  constructor() {}

  setup(
    core: CoreSetup,
    { expressions, formatFactory, editorFrame, charts }: PieVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const { getPieVisualization, pie, getPieRenderer } = await import('../async_services');
      const palettes = await charts.palettes.getPalettes();

      expressions.registerFunction(() => pie);

      expressions.registerRenderer(
        getPieRenderer({
          formatFactory,
          chartsThemeService: charts.theme,
          paletteService: palettes,
        })
      );
      return getPieVisualization({ paletteService: palettes });
    });
  }
}
