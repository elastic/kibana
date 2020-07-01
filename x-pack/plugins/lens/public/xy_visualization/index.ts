/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, IUiSettingsClient } from 'kibana/public';
import moment from 'moment-timezone';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import { UI_SETTINGS } from '../../../../../src/plugins/data/public';
import { xyVisualization } from './xy_visualization';
import { xyChart, getXyChartRenderer } from './xy_expression';
import { legendConfig, layerConfig, yAxisConfig } from './types';
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
    expressions.registerFunction(() => legendConfig);
    expressions.registerFunction(() => yAxisConfig);
    expressions.registerFunction(() => layerConfig);
    expressions.registerFunction(() => xyChart);

    expressions.registerRenderer(
      getXyChartRenderer({
        formatFactory,
        chartsThemeService: charts.theme,
        timeZone: getTimeZone(core.uiSettings),
        histogramBarTarget: core.uiSettings.get<number>(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      })
    );

    editorFrame.registerVisualization(xyVisualization);
  }
}
