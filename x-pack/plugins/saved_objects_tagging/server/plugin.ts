/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { savedObjectsTaggingFeature } from './features';
import { tagType } from './saved_objects';
import type {
  TagsHandlerContext,
  SavedObjectTaggingStart,
  CreateTagClientOptions,
  CreateTagAssignmentServiceOptions,
} from './types';
import { TagsRequestHandlerContext } from './request_handler_context';
import { registerRoutes } from './routes';
import { createTagUsageCollector } from './usage';
import { TagsClient, AssignmentService } from './services';

interface SetupDeps {
  features: FeaturesPluginSetup;
  usageCollection?: UsageCollectionSetup;
  security?: SecurityPluginSetup;
}

interface StartDeps {
  security?: SecurityPluginStart;
}

export class SavedObjectTaggingPlugin
  implements Plugin<{}, SavedObjectTaggingStart, SetupDeps, StartDeps>
{
  public setup(
    { savedObjects, http, getStartServices }: CoreSetup,
    { features, usageCollection, security }: SetupDeps
  ) {
    savedObjects.registerType(tagType);

    const router = http.createRouter<TagsHandlerContext>();
    registerRoutes({ router });

    http.registerRouteHandlerContext<TagsHandlerContext, 'tags'>(
      'tags',
      async (context, req, res) => {
        return new TagsRequestHandlerContext(req, await context.core, security);
      }
    );

    features.registerKibanaFeature(savedObjectsTaggingFeature);

    if (usageCollection) {
      const getKibanaIndices = () =>
        getStartServices()
          .then(([core]) => core.savedObjects.getAllIndices())
          .catch(() => []);
      usageCollection.registerCollector(
        createTagUsageCollector({
          usageCollection,
          getKibanaIndices,
        })
      );
    }

    return {};
  }

  public start(core: CoreStart, { security }: StartDeps) {
    return {
      createTagClient: ({ client }: CreateTagClientOptions) => {
        return new TagsClient({ client });
      },
      createInternalAssignmentService: ({ client }: CreateTagAssignmentServiceOptions) => {
        return new AssignmentService({
          client,
          authorization: security?.authz,
          typeRegistry: core.savedObjects.getTypeRegistry(),
          internal: true,
        });
      },
    };
  }
}
