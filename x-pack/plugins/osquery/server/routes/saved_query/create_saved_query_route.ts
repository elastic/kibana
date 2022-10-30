/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, pickBy, some, isBoolean } from 'lodash';
import type { IRouter } from '@kbn/core/server';
import { PLUGIN_ID } from '../../../common';
import type { CreateSavedQueryRequestSchemaDecoded } from '../../../common/schemas/routes/saved_query/create_saved_query_request_schema';
import { createSavedQueryRequestSchema } from '../../../common/schemas/routes/saved_query/create_saved_query_request_schema';
import { savedQuerySavedObjectType } from '../../../common/types';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { convertECSMappingToArray } from '../utils';

export const createSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/api/osquery/saved_queries',
      validate: {
        body: buildRouteValidation<
          typeof createSavedQueryRequestSchema,
          CreateSavedQueryRequestSchemaDecoded
        >(createSavedQueryRequestSchema),
      },
      options: { tags: [`access:${PLUGIN_ID}-writeSavedQueries`] },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const savedObjectsClient = coreContext.savedObjects.client;

      const {
        id,
        description,
        platform,
        query,
        version,
        interval,
        snapshot,
        removed,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ecs_mapping,
      } = request.body;

      const currentUser = await osqueryContext.security.authc.getCurrentUser(request)?.username;

      const conflictingEntries = await savedObjectsClient.find({
        type: savedQuerySavedObjectType,
        filter: `${savedQuerySavedObjectType}.attributes.id: "${id}"`,
      });

      if (
        conflictingEntries.saved_objects.length &&
        some(conflictingEntries.saved_objects, ['attributes.id', id])
      ) {
        return response.conflict({ body: `Saved query with id "${id}" already exists.` });
      }

      const savedQuerySO = await savedObjectsClient.create(
        savedQuerySavedObjectType,
        pickBy(
          {
            id,
            description,
            query,
            platform,
            version,
            interval,
            snapshot,
            removed,
            ecs_mapping: convertECSMappingToArray(ecs_mapping),
            created_by: currentUser,
            created_at: new Date().toISOString(),
            updated_by: currentUser,
            updated_at: new Date().toISOString(),
          },
          (value) => !isEmpty(value) || isBoolean(value)
        )
      );

      return response.ok({
        body: {
          data: pickBy(
            {
              ...savedQuerySO,
              ecs_mapping,
            },
            (value) => !isEmpty(value)
          ),
        },
      });
    }
  );
};
