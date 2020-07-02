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
import { tagMappings, tagAttachmentMappings } from './saved_objects';
import { TagsClientProvider } from './tags';
import { TagAttachmentsClientProvider } from './tag_attachments';
import { SecurityPluginSetup } from '../../security/server';
import { BfetchServerSetup, BfetchServerStart } from '../../../../src/plugins/bfetch/server';
import {
  TAGS_API_PATH,
  TagAttachmentClientGetResourceTagsParams,
  TagAttachmentClientGetResourceTagsResult,
} from '../common';

export interface TagsPluginSetupDependencies {
  bfetch: BfetchServerSetup;
  security?: SecurityPluginSetup;
}

export interface TagsPluginStartDependencies {
  bfetch: BfetchServerStart;
  security?: undefined;
}

export interface TagsPluginSetup {
  createTagsClient: TagsClientProvider['create'];
  createAttachmentsClient: TagAttachmentsClientProvider['create'];
}

export interface TagsPluginStart {
  createTagsClient: TagsClientProvider['create'];
  createAttachmentsClient: TagAttachmentsClientProvider['create'];
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
  private attachmentsClientProvider?: TagAttachmentsClientProvider;

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
    this.attachmentsClientProvider = new TagAttachmentsClientProvider({ logger });

    savedObjects.registerType({
      name: 'tag',
      hidden: false,
      namespaceType: 'single',
      mappings: tagMappings,
      management: {
        importableAndExportable: true,
        icon: 'tag',
        getTitle: (savedObject) => savedObject.attributes.title,
        defaultSearchField: 'title',
      },
    });

    savedObjects.registerType({
      name: 'tag_attachment',
      hidden: false,
      namespaceType: 'single',
      mappings: tagAttachmentMappings,
      management: {
        importableAndExportable: true,
        icon: 'merge',
        getTitle: (savedObject) =>
          savedObject.attributes.tagId + ' : ' + savedObject.attributes.kid,
        defaultSearchField: 'tagId',
      },
    });

    const router = http.createRouter();

    http.registerRouteHandlerContext('tags', this.createRouteHandlerContext(core, plugins));
    setupRoutes({ router });

    // Batch and stream back tags attached to KID resources as we will execute
    // this API call many times.
    plugins.bfetch.addBatchProcessingRoute<
      TagAttachmentClientGetResourceTagsParams,
      TagAttachmentClientGetResourceTagsResult
    >(`${TAGS_API_PATH}/_bfetch/get_attached_tags`, (request, { tags }) => ({
      onBatchItem: async (params) => {
        if (!tags) throw new Error('Tags request context not set up.');
        return await tags.attachmentsClient.getAttachedTags(params);
      },
    }));

    return {
      createTagsClient: this.tagsClientProvider.create,
      createAttachmentsClient: this.attachmentsClientProvider.create,
    };
  }

  public start(core: CoreStart, plugins: TagsPluginStartDependencies): TagsPluginStart {
    this.logger.debug('start()');

    return {
      createTagsClient: this.tagsClientProvider!.create,
      createAttachmentsClient: this.attachmentsClientProvider!.create,
    };
  }

  private createRouteHandlerContext = (
    setupCore: CoreSetup,
    setupPlugins: TagsPluginSetupDependencies
  ): IContextProvider<RequestHandler<unknown, unknown, unknown>, 'tags'> => {
    return async (context, request) => {
      const [core] = await setupCore.getStartServices();
      const { savedObjects } = core;
      const savedObjectsClient = savedObjects.getScopedClient(request);
      const params = {
        savedObjectsClient,
        user: setupPlugins.security?.authc.getCurrentUser(request),
      };
      const tagsClient = this.tagsClientProvider!.create(params);
      const attachmentsClient = this.attachmentsClientProvider!.create({ tagsClient, ...params });
      const tagsContext: TagsRequestHandlerContext = {
        tagsClient,
        attachmentsClient,
      };

      return tagsContext;
    };
  };
}
