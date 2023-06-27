/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map } from 'lodash';
import { schema } from '@kbn/config-schema';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';
import type { PackSavedObject } from '../../common/types';
import { PLUGIN_ID } from '../../../common';

import { packSavedObjectType } from '../../../common/types';
import { convertSOQueriesToPack } from './utils';
import { convertShardsToObject } from '../utils';
import type { ReadPackRestResponseData } from './types';
import type { PackResponseData } from './types';

export const readPackRoute = (router: IRouter) => {
  router.get(
    {
      path: '/api/osquery/packs/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: { tags: [`access:${PLUGIN_ID}-readPacks`] },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const savedObjectsClient = coreContext.savedObjects.client;

      const { attributes, references, id, ...rest } = await savedObjectsClient.get<PackSavedObject>(
        packSavedObjectType,
        request.params.id
      );

      const policyIds = map(filter(references, ['type', AGENT_POLICY_SAVED_OBJECT_TYPE]), 'id');
      const osqueryPackAssetReference = !!filter(references, ['type', 'osquery-pack-asset']);

      const data: PackResponseData & ReadPackRestResponseData = {
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
