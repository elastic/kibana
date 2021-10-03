/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { mapKeys, reduce, pick, set, find } from 'lodash';
import { schema } from '@kbn/config-schema';
import { produce } from 'immer';
import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../fleet/common';
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
      const agentPolicyService = osqueryContext.service.getAgentPolicyService();

      const packagePolicyService = osqueryContext.service.getPackagePolicyService();
      const currentUser = await osqueryContext.security.authc.getCurrentUser(request)?.username;

      const { name, description, queries, enabled, policy_ids } = request.body;

      const { items: packagePolicies } = await packagePolicyService?.list(savedObjectsClient, {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
        perPage: 1000,
        page: 1,
      });

      const agentPolicies = policy_ids
        ? mapKeys(await agentPolicyService?.getByIds(savedObjectsClient, policy_ids), 'id')
        : {};

      const references = policy_ids
        ? policy_ids.map((policyId: string) => ({
            id: policyId,
            name: agentPolicies[policyId].name,
            type: AGENT_POLICY_SAVED_OBJECT_TYPE,
          }))
        : [];

      const normalizedQueries = reduce(
        queries,
        (acc, value, key) => {
          const ecsMapping =
            value.ecs_mapping &&
            reduce(
              value.ecs_mapping,
              (acc, value, key) => {
                acc.push({ value: key, ...value });
                return acc;
              },
              []
            );
          if (value?.savedQueryId) {
            references.push({
              id: value.savedQueryId,
              type: savedQuerySavedObjectType,
              name: key,
            });
          }
          acc.push({
            id: key,
            ...pick(value, ['query', 'interval', 'platform', 'version']),
            ecs_mapping: ecsMapping,
          });
          return acc;
        },
        []
      );

      console.log('create params', {
        queries: normalizedQueries,
        references,
      });

      return response.ok({ body: undefined });

      // const packSO = await savedObjectsClient.create(
      //   packSavedObjectType,
      //   {
      //     name,
      //     description,
      //     queries,
      //     enabled,
      //     created_at: moment().toISOString(),
      //     created_by: currentUser,
      //     updated_at: moment().toISOString(),
      //     updated_by: currentUser,
      //   },
      //   {
      //     references: policy_ids
      //       ? policy_ids.map((policyId) => ({
      //           id: policyId,
      //           name: agentPolicies[policyId].name,
      //           type: AGENT_POLICY_SAVED_OBJECT_TYPE,
      //         }))
      //       : [],
      //     refresh: 'wait_for',
      //   }
      // );

      // if (enabled) {
      //   await Promise.all(
      //     policy_ids.map((agentPolicyId) => {
      //       const packagePolicy = find(packagePolicies, ['policy_id', agentPolicyId]);
      //       return packagePolicyService?.update(
      //         savedObjectsClient,
      //         esClient,
      //         packagePolicy.id,
      //         produce(packagePolicy, (draft) => {
      //           delete packagePolicy.id;
      //           set(draft, `inputs[0].config.osquery.value.packs.${packSO.attributes.name}`, {
      //             queries,
      //           });
      //           return draft;
      //         })
      //       );
      //     })
      //   );
      // }

      // return response.ok({ body: packSO });
    }
  );
};
