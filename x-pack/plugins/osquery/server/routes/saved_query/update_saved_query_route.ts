/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter } from 'lodash';
import { schema } from '@kbn/config-schema';

import { PLUGIN_ID } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { savedQuerySavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { convertECSMappingToArray, convertECSMappingToObject } from '../utils';

export const updateSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.put(
    {
      path: '/internal/osquery/saved_query/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object(
          {
            id: schema.string(),
            query: schema.string(),
            description: schema.maybe(schema.string()),
            interval: schema.maybe(schema.number()),
            platform: schema.maybe(schema.string()),
            version: schema.maybe(schema.string()),
            ecs_mapping: schema.maybe(
              schema.recordOf(
                schema.string(),
                schema.object({
                  field: schema.maybe(schema.string()),
                  value: schema.maybe(
                    schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
                  ),
                })
              )
            ),
          },
          { unknowns: 'allow' }
        ),
      },
      options: { tags: [`access:${PLUGIN_ID}-writeSavedQueries`] },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const savedObjectsClient = coreContext.savedObjects.client;
      const currentUser = await osqueryContext.security.authc.getCurrentUser(request)?.username;

      const {
        id,
        description,
        platform,
        query,
        version,
        interval,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ecs_mapping,
      } = request.body;

      const conflictingEntries = await savedObjectsClient.find<{ id: string }>({
        type: savedQuerySavedObjectType,
        filter: `${savedQuerySavedObjectType}.attributes.id: "${id}"`,
      });

      if (
        filter(conflictingEntries.saved_objects, (soObject) => soObject.id !== request.params.id)
          .length
      ) {
        return response.conflict({ body: `Saved query with id "${id}" already exists.` });
      }

      const updatedSavedQuerySO = await savedObjectsClient.update(
        savedQuerySavedObjectType,
        request.params.id,
        {
          id,
          description: description || '',
          platform,
          query,
          version,
          interval,
          ecs_mapping: convertECSMappingToArray(ecs_mapping),
          updated_by: currentUser,
          updated_at: new Date().toISOString(),
        },
        {
          refresh: 'wait_for',
        }
      );

      if (ecs_mapping || updatedSavedQuerySO.attributes.ecs_mapping) {
        // @ts-expect-error update types
        updatedSavedQuerySO.attributes.ecs_mapping =
          ecs_mapping ||
          (updatedSavedQuerySO.attributes.ecs_mapping &&
            // @ts-expect-error update types
            convertECSMappingToObject(updatedSavedQuerySO.attributes.ecs_mapping)) ||
          {};
      }

      return response.ok({
        body: updatedSavedQuerySO,
      });
    }
  );
};
