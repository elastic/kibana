/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../../src/core/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TagsPluginSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TagsPluginStartDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TagsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TagsPluginStart {}

export class TagsPlugin
  implements
    Plugin<
      TagsPluginSetup,
      TagsPluginStart,
      TagsPluginSetupDependencies,
      TagsPluginStartDependencies
    > {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<TagsPluginStartDependencies, unknown>,
    plugins: TagsPluginSetupDependencies
  ): TagsPluginSetup {
    return {};
  }

  public start(core: CoreStart, plugins: TagsPluginStartDependencies): TagsPluginStart {
    return {};
  }
}
