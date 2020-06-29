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
import { tagMappings } from './saved_objects';
import { TagsClientProvider } from './tags/tags_client_provider';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TagsPluginSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TagsPluginStartDependencies {}

export interface TagsPluginSetup {
  createTagsClient: TagsClientProvider['create'];
}

export interface TagsPluginStart {
  createTagsClient: TagsClientProvider['create'];
}

export class TagsPlugin
  implements
    Plugin<
      TagsPluginSetup,
      TagsPluginStart,
      TagsPluginSetupDependencies,
      TagsPluginStartDependencies
    > {
  private readonly logger: Logger;
  private tagsClientProvider?: TagsClientProvider;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('plugins', 'tags');
  }

  public setup(
    core: CoreSetup<TagsPluginStartDependencies, unknown>,
    plugins: TagsPluginSetupDependencies
  ): TagsPluginSetup {
    const { logger } = this;
    const { http, savedObjects } = core;

    logger.debug('setup()');

    this.tagsClientProvider = new TagsClientProvider({ logger });

    savedObjects.registerType({
      name: 'tag',
      hidden: false,
      namespaceType: 'single',
      mappings: tagMappings,
    });

    const router = http.createRouter();

    http.registerRouteHandlerContext('tags', this.createRouteHandlerContext(core));
    setupRoutes({ router });

    return {
      createTagsClient: this.tagsClientProvider.create,
    };
  }

  public start(core: CoreStart, plugins: TagsPluginStartDependencies): TagsPluginStart {
    this.logger.debug('start()');

    return {
      createTagsClient: this.tagsClientProvider!.create,
    };
  }

  private createRouteHandlerContext = (
    setupCore: CoreSetup
  ): IContextProvider<RequestHandler<unknown, unknown, unknown>, 'tags'> => {
    return async (context, request) => {
      const [core] = await setupCore.getStartServices();
      const { savedObjects } = core;
      const savedObjectsClient = savedObjects.getScopedClient(request);
      const tagsClient = this.tagsClientProvider!.create({ savedObjectsClient });
      const tagsContext: TagsRequestHandlerContext = {
        tagsClient,
      };

      return tagsContext;
    };
  };
}
