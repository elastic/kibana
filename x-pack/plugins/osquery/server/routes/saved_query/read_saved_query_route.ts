/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { PLUGIN_ID } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { savedQuerySavedObjectType } from '../../../common/types';
import { convertECSMappingToObject } from '../utils';

export const readSavedQueryRoute = (router: IRouter) => {
  router.get(
    {
      path: '/internal/osquery/saved_query/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: { tags: [`access:${PLUGIN_ID}-readSavedQueries`] },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const savedObjectsClient = coreContext.savedObjects.client;

      const savedQuery = await savedObjectsClient.get<{
        ecs_mapping: Array<{ key: string; value: Record<string, object> }>;
      }>(savedQuerySavedObjectType, request.params.id);

      if (savedQuery.attributes.ecs_mapping) {
        // @ts-expect-error update types
        savedQuery.attributes.ecs_mapping = convertECSMappingToObject(
          savedQuery.attributes.ecs_mapping
        );
      }

      return response.ok({
        body: savedQuery,
      });
    }
  );
};
