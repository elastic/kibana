/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import { EditorFrameSetup, FormatFactory } from '../types';

export interface MetricVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: Promise<FormatFactory>;
  editorFrame: EditorFrameSetup;
}

export class MetricVisualization {
  constructor() {}

  setup(
    _core: CoreSetup | null,
    { expressions, formatFactory, editorFrame }: MetricVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const { metricVisualization, metricChart, getMetricChartRenderer } = await import(
        '../async_services'
      );

      expressions.registerFunction(() => metricChart);

      expressions.registerRenderer(() => getMetricChartRenderer(formatFactory));
      return metricVisualization;
    });
  }
}
