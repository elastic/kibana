/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from 'kibana/public';
import type { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import type { EditorFrameSetup } from '../types';
import type { FormatFactory } from '../../common';

export interface MetricVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
  editorFrame: EditorFrameSetup;
}

export class MetricVisualization {
  setup(
    _core: CoreSetup | null,
    { expressions, formatFactory, editorFrame }: MetricVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const { metricVisualization, getMetricChartRenderer } = await import('../async_services');

      expressions.registerRenderer(() => getMetricChartRenderer(formatFactory));
      return metricVisualization;
    });
  }
}
