/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'kibana/public';
import type { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import type { EditorFrameSetup } from '../types';
import type { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import type { LensPluginStartDependencies } from '../plugin';
import { getTimeZone } from '../utils';
import type { FormatFactory } from '../../common';
import { LEGACY_TIME_AXIS } from '../../../../../src/plugins/charts/common';

export interface XyVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class XyVisualization {
  setup(
    core: CoreSetup<LensPluginStartDependencies, void>,
    { expressions, formatFactory, editorFrame }: XyVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const { getXyChartRenderer, getXyVisualization } = await import('../async_services');
      const [, { charts, fieldFormats }] = await core.getStartServices();
      const palettes = await charts.palettes.getPalettes();
      const useLegacyTimeAxis = core.uiSettings.get(LEGACY_TIME_AXIS);
      expressions.registerRenderer(
        getXyChartRenderer({
          formatFactory,
          chartsThemeService: charts.theme,
          chartsActiveCursorService: charts.activeCursor,
          paletteService: palettes,
          timeZone: getTimeZone(core.uiSettings),
          useLegacyTimeAxis,
          kibanaTheme: core.theme,
        })
      );
      return getXyVisualization({
        paletteService: palettes,
        fieldFormats,
        useLegacyTimeAxis,
        kibanaTheme: core.theme,
      });
    });
  }
}
