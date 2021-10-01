/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transform, set, unset, has, difference, filter, find, map } from 'lodash';
import { schema } from '@kbn/config-schema';
import { produce } from 'immer';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../fleet/common';
import { IRouter } from '../../../../../../src/core/server';

import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PLUGIN_ID } from '../../../common';

export const updatePackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.put(
    {
      path: '/internal/osquery/packs/{id}',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
        body: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-writePacks`] },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = context.core.savedObjects.client;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();

      const { name, description, queries, enabled, policy_ids } = request.body;

      const currentPackSO = await savedObjectsClient.get(packSavedObjectType, request.params.id);
      const { items: packagePolicies } = await packagePolicyService?.list(savedObjectsClient, {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
        perPage: 1000,
        page: 1,
      });
      const currentPackagePolicies = filter(packagePolicies, (packagePolicy) =>
        has(packagePolicy, `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`)
      );

      const currentAgentPolicyIds = map(currentPackagePolicies, 'policy_id');
      const agentPolicyIdsToRemove = difference(currentAgentPolicyIds, policy_ids);
      const agentPolicyIdsToUpdate = difference(currentAgentPolicyIds, agentPolicyIdsToRemove);
      const agentPolicyIdsToAdd = difference(policy_ids, currentAgentPolicyIds);

      console.log('agentPolicyToRemove', agentPolicyIdsToRemove);
      console.log('agentPolicyIdsToUpdate', agentPolicyIdsToUpdate);
      console.log('agentPolicyToAdd', agentPolicyIdsToAdd);

      await Promise.all(
        agentPolicyIdsToRemove.map((agentPolicyId) => {
          const packagePolicy = find(currentPackagePolicies, ['policy_id', agentPolicyId]);
          return packagePolicyService?.update(
            savedObjectsClient,
            esClient,
            packagePolicy.id,
            produce(packagePolicy, (draft) => {
              delete packagePolicy.id;
              delete draft.inputs[0].config.osquery.value.packs[currentPackSO.attributes.name];
              return draft;
            })
          );
        })
      );

      const updatedPackSO = await savedObjectsClient.update(
        packSavedObjectType,
        request.params.id,
        { name, description, queries, enabled }
      );

      await Promise.all(
        agentPolicyIdsToUpdate.map((agentPolicyId) => {
          const packagePolicy = find(packagePolicies, ['policy_id', agentPolicyId]);
          return packagePolicyService?.update(
            savedObjectsClient,
            esClient,
            packagePolicy.id,
            produce(packagePolicy, (draft) => {
              delete packagePolicy.id;
              if (updatedPackSO.attributes.name !== currentPackSO.attributes.name) {
                unset(
                  draft,
                  `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`
                );
              }

              set(draft, `inputs[0].config.osquery.value.packs.${updatedPackSO.attributes.name}`, {
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

      await Promise.all(
        agentPolicyIdsToAdd.map((agentPolicyId) => {
          const packagePolicy = find(packagePolicies, ['policy_id', agentPolicyId]);

          console.log('packagePolicy', JSON.stringify(packagePolicy));

          return packagePolicyService?.update(
            savedObjectsClient,
            esClient,
            packagePolicy.id,
            produce(packagePolicy, (draft) => {
              delete packagePolicy.id;
              if (!(draft.inputs.length && draft.inputs[0].streams.length)) {
                set(draft, 'inputs[0].streams', []);
              }
              set(draft, `inputs[0].config.osquery.value.packs.${updatedPackSO.attributes.name}`, {
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

      return response.ok({ body: updatedPackSO });
    }
  );
};
