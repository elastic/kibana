/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { ExpressionsSetup } from 'src/plugins/expressions/public';
import { pieVisualization } from './pie_visualization';
import { pie, getPieRenderer } from './register_expression';
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
    expressions.registerFunction(() => pie);

    expressions.registerRenderer(
      getPieRenderer({
        formatFactory,
        chartsThemeService: charts.theme,
      })
    );

    editorFrame.registerVisualization(pieVisualization);
  }
}
