/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Logger,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  IContextProvider,
  RequestHandler,
} from '../../../../src/core/server';
import { TagsRequestHandlerContext } from './types';
import { setupRoutes } from './router';

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
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('plugins', 'tags');
  }

  public setup(
    core: CoreSetup<TagsPluginStartDependencies, unknown>,
    plugins: TagsPluginSetupDependencies
  ): TagsPluginSetup {
    this.logger.debug('setup()');

    const { http } = core;
    const router = http.createRouter();

    http.registerRouteHandlerContext('tags', this.createRouteHandlerContext(core));
    setupRoutes({ router });

    return {};
  }

  public start(core: CoreStart, plugins: TagsPluginStartDependencies): TagsPluginStart {
    this.logger.debug('start()');

    return {};
  }

  private createRouteHandlerContext = (
    core: CoreSetup
  ): IContextProvider<RequestHandler<unknown, unknown, unknown>, 'tags'> => {
    return async (context, request) => {
      const tagsContext: TagsRequestHandlerContext = {};
      return tagsContext;
    };
  };
}
