/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, IUiSettingsClient } from 'kibana/public';
import moment from 'moment-timezone';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import { UI_SETTINGS } from '../../../../../src/plugins/data/public';
import { EditorFrameSetup, FormatFactory } from '../types';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';

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
    core: CoreSetup,
    { expressions, formatFactory, editorFrame, charts }: XyVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const {
        legendConfig,
        yAxisConfig,
        tickLabelsConfig,
        gridlinesConfig,
        axisTitlesVisibilityConfig,
        layerConfig,
        xyChart,
        getXyChartRenderer,
        getXyVisualization,
      } = await import('../async_services');
      const palettes = await charts.palettes.getPalettes();
      expressions.registerFunction(() => legendConfig);
      expressions.registerFunction(() => yAxisConfig);
      expressions.registerFunction(() => tickLabelsConfig);
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
          histogramBarTarget: core.uiSettings.get<number>(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
        })
      );
      return getXyVisualization({ paletteService: palettes });
    });
  }
}
