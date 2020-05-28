/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { CoreSetup } from 'src/core/public';
import { ExpressionsSetup } from 'src/plugins/expressions/public';
import { pieVisualization } from './pie_visualization';
import { pie, getPieRenderer } from './register_expression';
import { EditorFrameSetup, FormatFactory } from '../types';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';

export interface PieVisualizationPluginSetupPlugins {
  editorFrame: EditorFrameSetup;
  expressions: ExpressionsSetup;
  formatFactory: Promise<FormatFactory>;
}

export interface PieVisualizationPluginStartPlugins {
  uiActions: UiActionsStart;
}

export class PieVisualization {
  constructor() {}

  setup(
    core: CoreSetup,
    { expressions, formatFactory, editorFrame }: PieVisualizationPluginSetupPlugins
  ) {
    expressions.registerFunction(() => pie);

    expressions.registerRenderer(
      getPieRenderer({
        formatFactory,
        getChartTheme(darkModeOverwrite?: boolean) {
          const isDark = darkModeOverwrite ?? core.uiSettings.get<boolean>('theme:darkMode');

          return {
            theme: isDark ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme,
            isDark,
          };
        }
      })
    );

    editorFrame.registerVisualization(pieVisualization);
  }
}
