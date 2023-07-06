/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map, omit } from 'lodash';
import { schema } from '@kbn/config-schema';

import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import { packSavedObjectType } from '../../../common/types';
import { PLUGIN_ID } from '../../../common';
import type { PackSavedObject } from '../../common/types';
import type { PackResponseData } from './types';

export const findPackRoute = (router: IRouter) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/packs',
      options: { tags: [`access:${PLUGIN_ID}-readPacks`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: schema.object(
              {
                page: schema.maybe(schema.number()),
                pageSize: schema.maybe(schema.number()),
                sort: schema.maybe(schema.string()),
                sortOrder: schema.maybe(
                  schema.oneOf([schema.literal('asc'), schema.literal('desc')])
                ),
              },
              { unknowns: 'allow' }
            ),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.client;

        const soClientResponse = await savedObjectsClient.find<PackSavedObject>({
          type: packSavedObjectType,
          page: request.query.page ?? 1,
          perPage: request.query.pageSize ?? 20,
          sortField: request.query.sort ?? 'updated_at',
          sortOrder: request.query.sortOrder ?? 'desc',
        });

        const packSavedObjects: PackResponseData[] = map(soClientResponse.saved_objects, (pack) => {
          const policyIds = map(
            filter(pack.references, ['type', AGENT_POLICY_SAVED_OBJECT_TYPE]),
            'id'
          );

          const { attributes } = pack;

          return {
            name: attributes.name,
            description: attributes.description,
            queries: attributes.queries,
            version: attributes.version,
            enabled: attributes.enabled,
            created_at: attributes.created_at,
            created_by: attributes.created_by,
            updated_at: attributes.updated_at,
            updated_by: attributes.updated_by,
            saved_object_id: pack.id,
            policy_ids: policyIds,
          };
        });

        return response.ok({
          body: {
            ...omit(soClientResponse, 'saved_objects'),
            data: packSavedObjects,
          },
        });
      }
    );
};
