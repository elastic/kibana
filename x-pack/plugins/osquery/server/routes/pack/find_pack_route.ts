/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, has, map } from 'lodash';
import { schema } from '@kbn/config-schema';

import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../fleet/common';
import { IRouter } from '../../../../../../src/core/server';
import { packSavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PLUGIN_ID } from '../../../common';

export const findPackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.get(
    {
      path: '/internal/osquery/packs',
      validate: {
        query: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-readPacks`] },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();

      const soClientResponse = await savedObjectsClient.find<{
        name: string;
        description: string;
        queries: Array<{ name: string; interval: string }>;
      }>({
        type: packSavedObjectType,
        // @ts-expect-error update types
        page: parseInt(request.query.pageIndex ?? 0, 10) + 1,
        // @ts-expect-error update types
        perPage: request.query.pageSize ?? 20,
        // @ts-expect-error update types
        sortField: request.query.sortField ?? 'updated_at',
        // @ts-expect-error update types
        sortOrder: request.query.sortDirection ?? 'desc',
      });

      soClientResponse.saved_objects.map((pack) => {
        const policyIds = map(
          filter(pack.references, ['type', AGENT_POLICY_SAVED_OBJECT_TYPE]),
          'id'
        );

        pack.policy_ids = policyIds;
        return pack;
      });

      return response.ok({
        body: {
          ...soClientResponse,
          // items: packsWithSavedQueriesQueries,
        },
      });
    }
  );
};
