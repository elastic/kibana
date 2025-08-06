/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';

import type { PluginStartDependencies } from '.';

export function initRoutes(core: CoreSetup<PluginStartDependencies>) {
  const router = core.http.createRouter();

  // This route mirrors existing `GET /api/features` route except that it also returns all deprecated features.
  router.get(
    { path: '/internal/features_provider/features', validate: false },
    async (context, request, response) => {
      const [, pluginDeps] = await core.getStartServices();
      return response.ok({
        body: pluginDeps.features.getKibanaFeatures().map((feature) => feature.toRaw()),
      });
    }
  );
}
