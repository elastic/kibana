/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has, filter, unset } from 'lodash';
import { produce } from 'immer';
import { schema } from '@kbn/config-schema';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { IRouter } from '@kbn/core/server';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { PLUGIN_ID } from '../../../common';

import { packSavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';

export const deletePackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.delete(
    {
      path: '/internal/osquery/packs/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: { tags: [`access:${PLUGIN_ID}-writePacks`] },
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = coreContext.savedObjects.client;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();

      const currentPackSO = await savedObjectsClient.get<{ name: string }>(
        packSavedObjectType,
        request.params.id
      );

      await savedObjectsClient.delete(packSavedObjectType, request.params.id, {
        refresh: 'wait_for',
      });

      const { items: packagePolicies } = (await packagePolicyService?.list(savedObjectsClient, {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
        perPage: 1000,
        page: 1,
      })) ?? { items: [] };
      const currentPackagePolicies = filter(packagePolicies, (packagePolicy) =>
        has(packagePolicy, `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`)
      );

      await Promise.all(
        currentPackagePolicies.map((packagePolicy) =>
          packagePolicyService?.update(
            savedObjectsClient,
            esClient,
            packagePolicy.id,
            produce(packagePolicy, (draft) => {
              unset(draft, 'id');
              unset(
                draft,
                `inputs[0].config.osquery.value.packs.${[currentPackSO.attributes.name]}`
              );
              return draft;
            })
          )
        )
      );

      return response.ok({
        body: {},
      });
    }
  );
};
