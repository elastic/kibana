/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { exampleVisualization } from './example_visualization';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import { exampleChart, getExampleChartRenderer } from './example_expression';
import { EditorFrameSetup, FormatFactory } from '../types';

export interface SimpleExampleVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: Promise<FormatFactory>;
  editorFrame: EditorFrameSetup;
}

// The setup function, registers the visualization,
// expression function, and renderer.

export class SimpleExampleVisualization {
  constructor() {}

  setup(
    _core: CoreSetup | null,
    { expressions, formatFactory, editorFrame }: SimpleExampleVisualizationPluginSetupPlugins
  ) {
    expressions.registerFunction(() => exampleChart);

    expressions.registerRenderer(() => getExampleChartRenderer(formatFactory));

    editorFrame.registerVisualization(exampleVisualization);
  }
}
