/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin as IPlugin,
  PluginInitializerContext,
} from '../../../../src/core/public';

import { PluginSetup, PluginStart, SetupPlugins, StartPlugins } from './types';

export class Plugin implements IPlugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(initializerContext: PluginInitializerContext) {} // eslint-disable-line @typescript-eslint/no-useless-constructor

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public start(core: CoreStart, plugins: StartPlugins): PluginStart {
    return {};
  }
}
