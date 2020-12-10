/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import {
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Plugin,
  SharedGlobalConfig,
} from 'src/core/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { SecurityPluginSetup } from '../../security/server';
import { savedObjectsTaggingFeature } from './features';
import { tagType } from './saved_objects';
import { ITagsRequestHandlerContext } from './types';
import { TagsRequestHandlerContext } from './request_handler_context';
import { registerRoutes } from './routes';
import { createTagUsageCollector } from './usage';

interface SetupDeps {
  features: FeaturesPluginSetup;
  usageCollection?: UsageCollectionSetup;
  security?: SecurityPluginSetup;
}

export class SavedObjectTaggingPlugin implements Plugin<{}, {}, SetupDeps, {}> {
  private readonly legacyConfig$: Observable<SharedGlobalConfig>;

  constructor(context: PluginInitializerContext) {
    this.legacyConfig$ = context.config.legacy.globalConfig$;
  }

  public setup(
    { savedObjects, http }: CoreSetup,
    { features, usageCollection, security }: SetupDeps
  ) {
    savedObjects.registerType(tagType);

    const router = http.createRouter();
    registerRoutes({ router });

    http.registerRouteHandlerContext(
      'tags',
      async (context, req, res): Promise<ITagsRequestHandlerContext> => {
        return new TagsRequestHandlerContext(req, context.core, security);
      }
    );

    features.registerKibanaFeature(savedObjectsTaggingFeature);

    if (usageCollection) {
      usageCollection.registerCollector(
        createTagUsageCollector({
          usageCollection,
          legacyConfig$: this.legacyConfig$,
        })
      );
    }

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
}
