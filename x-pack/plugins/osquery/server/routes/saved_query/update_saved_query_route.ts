/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findIndex, set, unset, has, filter } from 'lodash';
import { schema } from '@kbn/config-schema';
import { produce } from 'immer';

import { PLUGIN_ID } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../fleet/common';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';

export const updateSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.put(
    {
      path: '/internal/osquery/saved_query/{id}',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
        body: schema.object({}, { unknowns: 'allow' }),
      },
      options: { tags: [`access:${PLUGIN_ID}-writeSavedQueries`] },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = context.core.savedObjects.client;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();

      const {
        // @ts-expect-error update types
        id: queryId,
        // @ts-expect-error update types
        description,
        // @ts-expect-error update types
        platform,
        // @ts-expect-error update types
        query,
        // @ts-expect-error update types
        version,
        // @ts-expect-error update types
        interval,
        // @ts-expect-error update types
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ecs_mapping,
      } = request.body;

      const currentSavedQuerySO = await savedObjectsClient.get(
        savedQuerySavedObjectType,
        // @ts-expect-error update types
        request.params.id
      );

      const updatedSavedQuerySO = await savedObjectsClient.update(
        savedQuerySavedObjectType,
        // @ts-expect-error update types
        request.params.id,
        {
          id: queryId,
          description,
          platform,
          query,
          version,
          interval,
          ecs_mapping,
        }
      );

      const { saved_objects: packs } = await savedObjectsClient.find({
        perPage: 100,
        type: packSavedObjectType,
        hasReference: {
          type: savedQuerySavedObjectType,
          // @ts-expect-error update types
          id: request.params.id,
        },
      });

      // @ts-expect-error update types
      const { items: packagePolicies } = await packagePolicyService?.list(savedObjectsClient, {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
        perPage: 1000,
        page: 1,
      });

      await Promise.all(
        packs.map(async (pack) => {
          const currentPackSO = await savedObjectsClient.get(packSavedObjectType, pack.id);
          const currentPackagePolicies = filter(packagePolicies, (packagePolicy) =>
            has(
              packagePolicy,
              // @ts-expect-error update types
              `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`
            )
          );

          // console.log('currentPackSO', JSON.stringify(currentPackSO, null, 2));
          // @ts-expect-error update types
          const savedQueryIndex = findIndex(currentPackSO.attributes.queries, [
            'id',
            // @ts-expect-error update types
            currentSavedQuerySO.attributes.id,
          ]);
          // console.log('savedQueryIndex', savedQueryIndex);

          await savedObjectsClient.update(
            packSavedObjectType,
            currentPackSO.id,
            // @ts-expect-error update types
            produce(currentPackSO.attributes, (draftPack) => {
              // @ts-expect-error update types
              draftPack.queries[savedQueryIndex] = {
                id: queryId,
                platform,
                query,
                version,
                interval,
                ecs_mapping,
              };

              return draftPack;
            }),
            {
              references: produce(currentPackSO.references, (draft) => {
                // @ts-expect-error update types
                if (currentSavedQuerySO.attributes.id !== queryId) {
                  // @ts-expect-error update types
                  draft = filter(draft, (reference) => reference.id === request.params.id);
                  draft.push({
                    // @ts-expect-error update types
                    id: request.params.id,
                    name: queryId,
                    type: savedQuerySavedObjectType,
                  });
                }
                return draft;
              }),
            }
          );

          await Promise.all(
            currentPackagePolicies.map((packagePolicy) =>
              packagePolicyService?.update(
                savedObjectsClient,
                esClient,
                packagePolicy.id,
                // @ts-expect-error update types
                produce(packagePolicy, (draft) => {
                  delete packagePolicy.id;
                  // @ts-expect-error update types
                  if (currentSavedQuerySO.attributes.id !== queryId) {
                    unset(
                      draft,
                      // @ts-expect-error update types
                      `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}.${currentSavedQuerySO.attributes.id}`
                    );
                  }

                  set(
                    draft,
                    // @ts-expect-error update types
                    `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}.${currentSavedQuerySO.attributes.id}`,
                    {
                      platform,
                      query,
                      version,
                      interval,
                      ecs_mapping,
                    }
                  );
                  return draft;
                })
              )
            )
          );
        })
      );

      return response.ok({
        body: updatedSavedQuerySO,
      });
    }
  );
};
