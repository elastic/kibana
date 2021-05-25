/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, IUiSettingsClient } from 'kibana/public';
import moment from 'moment-timezone';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import { EditorFrameSetup, FormatFactory } from '../types';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import { LensPluginStartDependencies } from '../plugin';

export interface XyVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: Promise<FormatFactory>;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

function getTimeZone(uiSettings: IUiSettingsClient) {
  const configuredTimeZone = uiSettings.get('dateFormat:tz');
  if (configuredTimeZone === 'Browser') {
    return moment.tz.guess();
  }

  return configuredTimeZone;
}

export class XyVisualization {
  constructor() {}

  setup(
    core: CoreSetup<LensPluginStartDependencies, void>,
    { expressions, formatFactory, editorFrame, charts }: XyVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const {
        legendConfig,
        yAxisConfig,
        tickLabelsConfig,
        gridlinesConfig,
        axisTitlesVisibilityConfig,
        axisExtentConfig,
        layerConfig,
        xyChart,
        getXyChartRenderer,
        getXyVisualization,
      } = await import('../async_services');
      const [, { data }] = await core.getStartServices();
      const palettes = await charts.palettes.getPalettes();
      expressions.registerFunction(() => legendConfig);
      expressions.registerFunction(() => yAxisConfig);
      expressions.registerFunction(() => tickLabelsConfig);
      expressions.registerFunction(() => axisExtentConfig);
      expressions.registerFunction(() => gridlinesConfig);
      expressions.registerFunction(() => axisTitlesVisibilityConfig);
      expressions.registerFunction(() => layerConfig);
      expressions.registerFunction(() => xyChart);

      expressions.registerRenderer(
        getXyChartRenderer({
          formatFactory,
          chartsThemeService: charts.theme,
          paletteService: palettes,
          timeZone: getTimeZone(core.uiSettings),
        })
      );
      return getXyVisualization({ paletteService: palettes, data });
    });
  }
}
