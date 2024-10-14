/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map } from 'lodash';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';
import type { ReadPacksRequestParamsSchema } from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import type { PackSavedObject } from '../../common/types';
import { PLUGIN_ID } from '../../../common';

import { packSavedObjectType } from '../../../common/types';
import { convertSOQueriesToPack } from './utils';
import { convertShardsToObject } from '../utils';
import type { ReadPackResponseData } from './types';
import { readPacksRequestParamsSchema } from '../../../common/api';

export const readPackRoute = (router: IRouter) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/packs/{id}',
      options: { tags: [`access:${PLUGIN_ID}-readPacks`] },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidation<
              typeof readPacksRequestParamsSchema,
              ReadPacksRequestParamsSchema
            >(readPacksRequestParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.client;

        const { attributes, references, id, ...rest } =
          await savedObjectsClient.get<PackSavedObject>(packSavedObjectType, request.params.id);

        const policyIds = map(
          filter(references, ['type', LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE]),
          'id'
        );
        const osqueryPackAssetReference = !!filter(references, ['type', 'osquery-pack-asset']);

        const data: ReadPackResponseData = {
          type: rest.type,
          namespaces: rest.namespaces,
          migrationVersion: rest.migrationVersion,
          managed: rest.managed,
          coreMigrationVersion: rest.coreMigrationVersion,
          name: attributes.name,
          description: attributes.description,
          version: attributes.version,
          enabled: attributes.enabled,
          created_at: attributes.created_at,
          created_by: attributes.created_by,
          updated_at: attributes.updated_at,
          updated_by: attributes.updated_by,
          saved_object_id: id,
          queries: convertSOQueriesToPack(attributes.queries),
          shards: convertShardsToObject(attributes.shards),
          policy_ids: policyIds,
          read_only: attributes.version !== undefined && osqueryPackAssetReference,
        };

        return response.ok({
          body: {
            data,
          },
        });
      }
    );
};
