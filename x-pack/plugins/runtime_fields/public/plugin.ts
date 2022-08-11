/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';

import { PluginSetup, PluginStart, SetupPlugins, StartPlugins } from './types';
import { getRuntimeFieldEditorLoader } from './load_editor';

export class RuntimeFieldsPlugin
  implements Plugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins>
{
  public setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup {
    return {
      loadEditor: getRuntimeFieldEditorLoader(core),
    };
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    return {};
  }

  public stop() {
    return {};
  }
}
