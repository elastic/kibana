/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map } from 'lodash';
import { schema } from '@kbn/config-schema';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { IRouter } from '@kbn/core/server';
import { PackSavedObjectAttributes } from '../../common/types';
import { PLUGIN_ID } from '../../../common';

import { packSavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { convertSOQueriesToPack } from './utils';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const readPackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/packs/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: { tags: [`access:${PLUGIN_ID}-readPacks`] },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      const { attributes, references, ...rest } =
        await savedObjectsClient.get<PackSavedObjectAttributes>(
          packSavedObjectType,
          request.params.id
        );

      const policyIds = map(filter(references, ['type', AGENT_POLICY_SAVED_OBJECT_TYPE]), 'id');
      const osqueryPackAssetReference = !!filter(references, ['type', 'osquery-pack-asset']);

      return response.ok({
        body: {
          ...rest,
          ...attributes,
          queries: convertSOQueriesToPack(attributes.queries),
          policy_ids: policyIds,
          read_only: attributes.version !== undefined && osqueryPackAssetReference,
        },
      });
    }
  );
};
