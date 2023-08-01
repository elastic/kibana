/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';

import { omit } from 'lodash';
import { API_VERSIONS } from '../../../common/constants';
import type { SavedQueryResponse } from './types';
import type { SavedQuerySavedObject } from '../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PLUGIN_ID } from '../../../common';
import { savedQuerySavedObjectType } from '../../../common/types';
import { convertECSMappingToObject } from '../utils';
import { getInstalledSavedQueriesMap } from './utils';

export const findSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/saved_queries',
      options: { tags: [`access:${PLUGIN_ID}-readSavedQueries`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: schema.object({
              page: schema.number({ defaultValue: 1 }),
              pageSize: schema.maybe(schema.number()),
              sort: schema.string({ defaultValue: 'id' }),
              sortOrder: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
                defaultValue: 'desc',
              }),
            }),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.client;

        try {
          const savedQueries = await savedObjectsClient.find<SavedQuerySavedObject>({
            type: savedQuerySavedObjectType,
            page: request.query.page,
            perPage: request.query.pageSize,
            sortField: request.query.sort,
            sortOrder: request.query.sortOrder,
          });

          const prebuiltSavedQueriesMap = await getInstalledSavedQueriesMap(
            osqueryContext.service.getPackageService()?.asInternalUser
          );
          const savedObjects: SavedQueryResponse[] = savedQueries.saved_objects.map(
            (savedObject) => {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              const ecs_mapping = savedObject.attributes.ecs_mapping;

              savedObject.attributes.prebuilt = !!prebuiltSavedQueriesMap[savedObject.id];

              if (ecs_mapping) {
                // @ts-expect-error update types
                savedObject.attributes.ecs_mapping = convertECSMappingToObject(ecs_mapping);
              }

              const {
                created_at: createdAt,
                created_by: createdBy,
                description,
                id,
                interval,
                platform,
                query,
                removed,
                snapshot,
                version,
                ecs_mapping: ecsMapping,
                updated_at: updatedAt,
                updated_by: updatedBy,
                prebuilt,
              } = savedObject.attributes;

              return {
                created_at: createdAt,
                created_by: createdBy,
                description,
                id,
                removed,
                snapshot,
                version,
                ecs_mapping: ecsMapping,
                interval,
                platform,
                query,
                updated_at: updatedAt,
                updated_by: updatedBy,
                prebuilt,
                saved_object_id: savedObject.id,
              };
            }
          );

          return response.ok({
            body: {
              ...omit(savedQueries, 'saved_objects'),
              data: savedObjects,
            },
          });
        } catch (e) {
          return response.customError({
            statusCode: e.statusCode || e.output?.statusCode || 500,
            body: e,
          });
        }
      }
    );
};
