/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { has, mapKeys, set, unset, find } from 'lodash';
import { schema } from '@kbn/config-schema';
import { produce } from 'immer';
import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PackagePolicy,
} from '../../../../fleet/common';
import { IRouter } from '../../../../../../src/core/server';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { PLUGIN_ID } from '../../../common';
import { packSavedObjectType } from '../../../common/types';
import { convertPackQueriesToSO } from './utils';
import { getInternalSavedObjectsClient } from '../../usage/collector';

export const createPackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.post(
    {
      path: '/internal/osquery/packs',
      validate: {
        body: schema.object(
          {
            name: schema.string(),
            description: schema.maybe(schema.string()),
            enabled: schema.maybe(schema.boolean()),
            policy_ids: schema.maybe(schema.arrayOf(schema.string())),
            queries: schema.recordOf(
              schema.string(),
              schema.object({
                query: schema.string(),
                interval: schema.maybe(schema.number()),
                platform: schema.maybe(schema.string()),
                version: schema.maybe(schema.string()),
                ecs_mapping: schema.maybe(
                  schema.recordOf(
                    schema.string(),
                    schema.object({
                      field: schema.maybe(schema.string()),
                      value: schema.maybe(
                        schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
                      ),
                    })
                  )
                ),
              })
            ),
          },
          { unknowns: 'allow' }
        ),
      },
      options: { tags: [`access:${PLUGIN_ID}-writePacks`] },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = coreContext.savedObjects.client;
      const internalSavedObjectsClient = await getInternalSavedObjectsClient(
        osqueryContext.getStartServices
      );
      const agentPolicyService = osqueryContext.service.getAgentPolicyService();

      const packagePolicyService = osqueryContext.service.getPackagePolicyService();
      const currentUser = await osqueryContext.security.authc.getCurrentUser(request)?.username;

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { name, description, queries, enabled, policy_ids } = request.body;

      const conflictingEntries = await savedObjectsClient.find({
        type: packSavedObjectType,
        filter: `${packSavedObjectType}.attributes.name: "${name}"`,
      });

      if (conflictingEntries.saved_objects.length) {
        return response.conflict({ body: `Pack with name "${name}" already exists.` });
      }

      const { items: packagePolicies } = (await packagePolicyService?.list(
        internalSavedObjectsClient,
        {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
          perPage: 1000,
          page: 1,
        }
      )) ?? { items: [] };

      const agentPolicies = policy_ids
        ? mapKeys(await agentPolicyService?.getByIds(internalSavedObjectsClient, policy_ids), 'id')
        : {};

      const references = policy_ids
        ? policy_ids.map((policyId: string) => ({
            id: policyId,
            name: agentPolicies[policyId].name,
            type: AGENT_POLICY_SAVED_OBJECT_TYPE,
          }))
        : [];

      const packSO = await savedObjectsClient.create(
        packSavedObjectType,
        {
          name,
          description,
          queries: convertPackQueriesToSO(queries),
          enabled,
          created_at: moment().toISOString(),
          created_by: currentUser,
          updated_at: moment().toISOString(),
          updated_by: currentUser,
        },
        {
          references,
          refresh: 'wait_for',
        }
      );

      if (enabled && policy_ids?.length) {
        await Promise.all(
          policy_ids.map((agentPolicyId) => {
            const packagePolicy = find(packagePolicies, ['policy_id', agentPolicyId]);
            if (packagePolicy) {
              return packagePolicyService?.update(
                internalSavedObjectsClient,
                esClient,
                packagePolicy.id,
                produce<PackagePolicy>(packagePolicy, (draft) => {
                  unset(draft, 'id');
                  if (!has(draft, 'inputs[0].streams')) {
                    set(draft, 'inputs[0].streams', []);
                  }
                  set(draft, `inputs[0].config.osquery.value.packs.${packSO.attributes.name}`, {
                    queries,
                  });
                  return draft;
                })
              );
            }
          })
        );
      }

      // @ts-expect-error update types
      packSO.attributes.queries = queries;

      return response.ok({ body: packSO });
    }
  );
};
