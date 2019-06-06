/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '@kbn/interpreter/target/common';
import { CoreSetup } from 'src/core/public';
import { xyVisualization } from './xy_visualization';

import {
  renderersRegistry,
  functionsRegistry,
  // @ts-ignore untyped dependency
} from '../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { ExpressionFunction } from '../../../../../src/legacy/core_plugins/interpreter/public';
import { xyChart, xyChartRenderer } from './xy_expression';
import { legendConfig, xConfig, yConfig } from './types';

// TODO these are intermediary types because interpreter is not typed yet
// They can get replaced by references to the real interfaces as soon as they
// are available
interface RenderHandlers {
  done: () => void;
  onDestroy: (fn: () => void) => void;
}
export interface RenderFunction<T = unknown> {
  name: string;
  displayName: string;
  help: string;
  validate: () => void;
  reuseDomNode: boolean;
  render: (domNode: Element, data: T, handlers: RenderHandlers) => void;
}

export interface InterpreterSetup {
  renderersRegistry: Registry<RenderFunction, RenderFunction>;
  functionsRegistry: Registry<
    ExpressionFunction<string, unknown, unknown, unknown>,
    ExpressionFunction<string, unknown, unknown, unknown>
  >;
}

export interface XyVisualizationPluginSetupPlugins {
  interpreter: InterpreterSetup;
}

class XyVisualizationPlugin {
  constructor() {}

  setup(_core: CoreSetup | null, { interpreter }: XyVisualizationPluginSetupPlugins) {
    interpreter.functionsRegistry.register(() => legendConfig);
    interpreter.functionsRegistry.register(() => xConfig);
    interpreter.functionsRegistry.register(() => yConfig);
    interpreter.functionsRegistry.register(() => xyChart);

    interpreter.renderersRegistry.register(() => xyChartRenderer as RenderFunction<unknown>);

    return xyVisualization;
  }

  stop() {}
}

const plugin = new XyVisualizationPlugin();

export const xyVisualizationSetup = () =>
  plugin.setup(null, {
    interpreter: {
      renderersRegistry,
      functionsRegistry,
    },
  });
export const xyVisualizationStop = () => plugin.stop();
