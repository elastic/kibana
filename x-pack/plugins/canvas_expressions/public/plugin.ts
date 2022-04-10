/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin as PluginInterface,
  PluginInitializerContext,
} from '../../../../src/core/public';
import { ExpressionsSetup, ExpressionsStart } from '../../../../src/plugins/expressions/public';
import { commonFunctions } from '../common/functions';
import { CanvasSetup } from '../../canvas/public';

export type { CoreStart, CoreSetup };

/**
 * These are the private interfaces for the services your plugin depends on.
 * @internal
 */
// This interface will be built out as we require other plugins for setup
export interface SetupDeps {
  expressions: ExpressionsSetup;
  canvas: CanvasSetup;
}

/** @internal */
export class Plugin implements PluginInterface<{}, {}, SetupDeps> {
  constructor(initContext: PluginInitializerContext) {}

  public setup(coreSetup: CoreSetup, setupPlugins: SetupDeps) {
    setupPlugins.canvas.addFunctions(commonFunctions);

    return {};
  }

  public start(coreStart: CoreStart) {
    return {};
  }
}
