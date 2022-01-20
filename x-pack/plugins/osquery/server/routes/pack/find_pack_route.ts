/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map } from 'lodash';
import { schema } from '@kbn/config-schema';

import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../../../fleet/common';
import { IRouter } from '../../../../../../src/core/server';
import { packSavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PLUGIN_ID } from '../../../common';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const findPackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/packs',
      validate: {
        query: schema.object(
          {
            pageIndex: schema.maybe(schema.string()),
            pageSize: schema.maybe(schema.number()),
            sortField: schema.maybe(schema.string()),
            sortOrder: schema.maybe(schema.string()),
          },
          { unknowns: 'allow' }
        ),
      },
      options: { tags: [`access:${PLUGIN_ID}-readPacks`] },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      const soClientResponse = await savedObjectsClient.find<{
        name: string;
        description: string;
        queries: Array<{ name: string; interval: number }>;
        policy_ids: string[];
      }>({
        type: packSavedObjectType,
        page: parseInt(request.query.pageIndex ?? '0', 10) + 1,
        perPage: request.query.pageSize ?? 20,
        sortField: request.query.sortField ?? 'updated_at',
        // @ts-expect-error sortOrder type must be union of ['asc', 'desc']
        sortOrder: request.query.sortOrder ?? 'desc',
      });

      soClientResponse.saved_objects.map((pack) => {
        const policyIds = map(
          filter(pack.references, ['type', AGENT_POLICY_SAVED_OBJECT_TYPE]),
          'id'
        );

        // @ts-expect-error update types
        pack.policy_ids = policyIds;
        return pack;
      });

      return response.ok({
        body: soClientResponse,
      });
    }
  );
};
