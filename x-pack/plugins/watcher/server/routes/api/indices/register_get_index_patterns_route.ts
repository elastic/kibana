/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResult } from 'src/core/server';
import { RouteDependencies } from '../../../types';

export function registerGetIndexPatternsRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.get(
    {
      path: '/api/watcher/indices/index_patterns',
      validate: false,
    },
    license.guardApiRoute(async ({ core }, request, response) => {
      try {
        const { savedObjects } = await core;
        const finder = savedObjects.client.createPointInTimeFinder({
          type: 'index-pattern',
          fields: ['title'],
          perPage: 1000,
        });

        const responses: string[] = [];

        for await (const result of finder.find()) {
          responses.push(
            ...result.saved_objects.map(
              (indexPattern: SavedObjectsFindResult<any>) => indexPattern.attributes.title
            )
          );
        }

        await finder.close();

        return response.ok({ body: responses });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
