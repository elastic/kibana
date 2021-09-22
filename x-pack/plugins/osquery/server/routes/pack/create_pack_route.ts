/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../fleet/common';
import { IRouter } from '../../../../../../src/core/server';

import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';

export const createPackRoute = (router: IRouter, osqueryContext) => {
  router.post(
    {
      path: '/internal/osquery/packs',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = context.core.savedObjects.client;
      const agentPolicyService = osqueryContext.service.getAgentPolicyService();
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();

      const {
        name,
        description,
        queries,
        namespace,
        enabled,
        integration_version,
        agent_policy_ids,
      } = request.body;

      const packSO = await savedObjectsClient.create(
        packSavedObjectType,
        {
          name,
          description,
          queries,
          namespace,
          enabled,
        },
        {
          refresh: 'wait_for',
        }
      );

      if (!agent_policy_ids?.length) {
        return response.ok({ body: packSO });
      }

      const agentPolicies = await agentPolicyService.getByIds(agent_policy_ids);

      const packagePolicies = await Promise.all(
        agent_policy_ids.map((agentPolicyId) =>
          packagePolicyService?.create(savedObjectsClient, esClient, {
            name: 'osquery_manager_controlled',
            description,
            policy_id: agentPolicyId,
            namespace,
            inputs: [
              {
                type: 'osquery',
                enabled: true,
                streams: [
                  {
                    data_stream: { type: 'logs', dataset: 'osquery_manager.result' },
                    enabled: true,
                    vars: {
                      id: { type: 'text', value: 'Test' },
                      interval: { type: 'integer', value: 3600 },
                      query: { type: 'text', value: 'select * from users;' },
                    },
                  },
                ],
              },
            ],
            enabled: true,
            output_id: '',
            package: { name: 'osquery_manager', version: '0.5.2', title: 'Osquery manager' },
          })
        )
      );

      const packSOWithReferences = await savedObjectsClient.update(
        packSavedObjectType,
        packSO.id,
        {},
        {
          references: packagePolicies.map((packagePolicy) => ({
            type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            id: packagePolicy.id,
            name: packagePolicy.policy_id,
          })),
        }
      );

      return response.ok({
        body: packSOWithReferences,
      });
    }
  );
};
