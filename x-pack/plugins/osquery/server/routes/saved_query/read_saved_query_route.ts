/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../../src/core/server';
import { savedQuerySavedObjectType } from '../../../common/types';
import { convertECSMappingToObject } from '../utils';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const readSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/saved_query/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const [coreStartServices] = await osqueryContext.getStartServices();

      const {
        osquery: { readSavedQueries },
      } = await coreStartServices.capabilities.resolveCapabilities(request);

      if (!readSavedQueries) {
        return response.forbidden();
      }
      const savedObjectsClient = context.core.savedObjects.client;

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
