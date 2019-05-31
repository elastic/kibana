/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '@kbn/interpreter/target/common';
import { xyVisualization } from './xy_visualization';

// import {
//   renderersRegistry,
//   functionsRegistry,
// } from '../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { ExpressionFunction } from '../../../../../src/legacy/core_plugins/interpreter/public';

// TODO these are intermediary types because interpreter is not typed yet
// They can get replaced by references to the real interfaces as soon as they
// are available
interface RenderHandlers {
  done: () => void;
  onDestroy: (fn: () => void) => void;
}
export interface RenderFunction {
  name: string;
  displayName: string;
  help: string;
  validate: () => void;
  reuseDomNode: boolean;
  render: (domNode: Element, data: unknown, handlers: RenderHandlers) => void;
}

export interface InterpreterSetup {
  renderersRegistry: Registry<RenderFunction, RenderFunction>;
  functionsRegistry: Registry<
    ExpressionFunction<string, unknown, unknown, unknown>,
    ExpressionFunction<string, unknown, unknown, unknown>
  >;
}

class XyVisualizationPlugin {
  constructor() {}

  setup() {
    return xyVisualization;
  }

  stop() {}
}

const plugin = new XyVisualizationPlugin();

export const xyVisualizationSetup = () => plugin.setup();
export const xyVisualizationStop = () => plugin.stop();
