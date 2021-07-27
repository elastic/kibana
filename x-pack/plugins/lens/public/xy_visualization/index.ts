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

export interface XyVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: Promise<FormatFactory>;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class XyVisualization {
  constructor() {}

  setup(
    core: CoreSetup<LensPluginStartDependencies, void>,
    { expressions, formatFactory, editorFrame }: XyVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const {
        legendConfig,
        yAxisConfig,
        tickLabelsConfig,
        gridlinesConfig,
        axisTitlesVisibilityConfig,
        axisExtentConfig,
        labelsOrientationConfig,
        layerConfig,
        xyChart,
        getXyChartRenderer,
        getXyVisualization,
      } = await import('../async_services');
      const [, { data, charts }] = await core.getStartServices();
      const palettes = await charts.palettes.getPalettes();
      expressions.registerFunction(() => legendConfig);
      expressions.registerFunction(() => yAxisConfig);
      expressions.registerFunction(() => tickLabelsConfig);
      expressions.registerFunction(() => axisExtentConfig);
      expressions.registerFunction(() => labelsOrientationConfig);
      expressions.registerFunction(() => gridlinesConfig);
      expressions.registerFunction(() => axisTitlesVisibilityConfig);
      expressions.registerFunction(() => layerConfig);
      expressions.registerFunction(() => xyChart);

      expressions.registerRenderer(
        getXyChartRenderer({
          formatFactory,
          chartsThemeService: charts.theme,
          chartsActiveCursorService: charts.activeCursor,
          paletteService: palettes,
          timeZone: getTimeZone(core.uiSettings),
        })
      );
      return getXyVisualization({ paletteService: palettes, data });
    });
  }
}
