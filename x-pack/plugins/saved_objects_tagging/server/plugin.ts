/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, PluginInitializerContext, Plugin } from 'src/core/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { savedObjectsTaggingFeature } from './features';
import { tagType } from './saved_objects';
import { ITagsRequestHandlerContext } from './types';
import { registerRoutes } from './routes';
import { TagsRequestHandlerContext } from './request_handler_context';

interface SetupDeps {
  features: FeaturesPluginSetup;
}

export class SavedObjectTaggingPlugin implements Plugin<{}, {}, SetupDeps, {}> {
  constructor(context: PluginInitializerContext) {}

  public setup({ savedObjects, http }: CoreSetup, { features }: SetupDeps) {
    savedObjects.registerType(tagType);

    const router = http.createRouter();
    registerRoutes({ router });

    http.registerRouteHandlerContext(
      'tags',
      async (context, req, res): Promise<ITagsRequestHandlerContext> => {
        return new TagsRequestHandlerContext(context.core);
      }
    );

    features.registerKibanaFeature(savedObjectsTaggingFeature);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
}
