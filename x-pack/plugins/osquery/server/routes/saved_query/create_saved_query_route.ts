/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, pickBy } from 'lodash';
import { IRouter } from '../../../../../../src/core/server';
import { PLUGIN_ID } from '../../../common';
import {
  createSavedQueryRequestSchema,
  CreateSavedQueryRequestSchemaDecoded,
} from '../../../common/schemas/routes/saved_query/create_saved_query_request_schema';
import { savedQuerySavedObjectType } from '../../../common/types';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { convertECSMappingToArray } from '../utils';

export const createSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/internal/osquery/saved_query',
      validate: {
        body: buildRouteValidation<
          typeof createSavedQueryRequestSchema,
          CreateSavedQueryRequestSchemaDecoded
        >(createSavedQueryRequestSchema),
      },
      options: { tags: [`access:${PLUGIN_ID}-writeSavedQueries`] },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { id, description, platform, query, version, interval, ecs_mapping } = request.body;

      const currentUser = await osqueryContext.security.authc.getCurrentUser(request)?.username;

      const conflictingEntries = await savedObjectsClient.find({
        type: savedQuerySavedObjectType,
        filter: `${savedQuerySavedObjectType}.attributes.id: "${id}"`,
      });

      if (conflictingEntries.saved_objects.length) {
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
            ecs_mapping: convertECSMappingToArray(ecs_mapping),
            created_by: currentUser,
            created_at: new Date().toISOString(),
            updated_by: currentUser,
            updated_at: new Date().toISOString(),
          },
          (value) => !isEmpty(value)
        )
      );

      return response.ok({
        body: pickBy(
          {
            ...savedQuerySO,
            ecs_mapping,
          },
          (value) => !isEmpty(value)
        ),
      });
    }
  );
};
