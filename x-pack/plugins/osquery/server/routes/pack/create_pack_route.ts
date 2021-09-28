/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, transform, set, unset, has, difference, filter, find, map } from 'lodash';
import { schema } from '@kbn/config-schema';
import { produce } from 'immer';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../fleet/common';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';

import { PLUGIN_ID } from '../../../common';


import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';

export const createPackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/internal/osquery/packs',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-writePacks`] },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = context.core.savedObjects.client;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();

      const { name, description, queries, enabled, policy_ids } = request.body;

      const { items: packagePolicies } = await packagePolicyService?.list(savedObjectsClient, {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
        perPage: 1000,
        page: 1,
      });

      const packSO = await savedObjectsClient.create(
        packSavedObjectType,
        {
          name,
          description,
          queries,
          enabled,
        },
        {
          refresh: 'wait_for',
        }
      );

      await Promise.all(
        policy_ids.map((agentPolicyId) => {
          const packagePolicy = find(packagePolicies, ['policy_id', agentPolicyId]);
          return packagePolicyService?.update(
            savedObjectsClient,
            esClient,
            packagePolicy.id,
            produce(packagePolicy, (draft) => {
              delete packagePolicy.id;
              set(draft, `inputs[0].config.osquery.value.packs.${packSO.attributes.name}`, {
                queries: transform(
                  queries,
                  (result, query) => {
                    const { id: queryId, ...rest } = query;
                    result[queryId] = rest;
                  },
                  {}
                ),
              });
              return draft;
            })
          );
        })
      );

      return response.ok({ body: packSO });
    }
  );
};
