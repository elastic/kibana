/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set, unset, has, filter, pickBy, reduce, findIndex } from 'lodash';
import { schema } from '@kbn/config-schema';
import { produce } from 'immer';

import { PLUGIN_ID } from '../../../common';
import { IRouter } from '../../../../../../src/core/server';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';
import { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, PackagePolicy } from '../../../../fleet/common';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';

export const updateSavedQueryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.put(
    {
      path: '/internal/osquery/saved_query/{id}',
      validate: {
        params: schema.object(
          {
            id: schema.string(),
          },
          { unknowns: 'allow' }
        ),
        body: schema.object(
          {
            id: schema.string(),
            query: schema.string(),
            description: schema.maybe(schema.string()),
            interval: schema.maybe(schema.string()),
            platform: schema.maybe(schema.string()),
            version: schema.maybe(schema.string()),
            ecs_mapping: schema.maybe(
              schema.recordOf(
                schema.string(),
                schema.object({
                  field: schema.string(),
                })
              )
            ),
          },
          { unknowns: 'allow' }
        ),
      },
      options: { tags: [`access:${PLUGIN_ID}-writeSavedQueries`] },
    },
    async (context, request, response) => {
      const esClient = context.core.elasticsearch.client.asCurrentUser;
      const savedObjectsClient = context.core.savedObjects.client;
      const packagePolicyService = osqueryContext.service.getPackagePolicyService();

      const {
        id: queryId,
        description,
        platform,
        query,
        version,
        interval,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ecs_mapping,
      } = request.body;

      const currentSavedQuerySO = await savedObjectsClient.get<{ id: string }>(
        savedQuerySavedObjectType,
        request.params.id
      );

      const normalizedEcsMapping = reduce(
        ecs_mapping,
        (acc, { field, value }) => {
          acc.push({ field, value });
          return acc;
        },
        []
      );

      const updatedSavedQuerySO = await savedObjectsClient.update(
        savedQuerySavedObjectType,
        request.params.id,
        pickBy({
          id: queryId,
          description,
          platform,
          query,
          version,
          interval,
          ecs_mapping: ecs_mapping ? normalizedEcsMapping : null,
        })
      );

      const { saved_objects: packs } = await savedObjectsClient.find({
        perPage: 100,
        type: packSavedObjectType,
        hasReference: {
          type: savedQuerySavedObjectType,
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
          const currentPackSO = await savedObjectsClient.get<{
            id: string;
            queries: Array<
              Record<
                string,
                {
                  id: string;
                }
              >
            >;
          }>(packSavedObjectType, pack.id);
          const currentPackagePolicies = filter(packagePolicies, (packagePolicy) =>
            has(
              packagePolicy,
              // @ts-expect-error update types
              `inputs[0].config.osquery.value.packs.${currentPackSO.attributes.name}`
            )
          );
          const packQueryIndex = findIndex(currentPackSO.attributes.queries, [
            'id',
            currentSavedQuerySO.attributes.id,
          ]);

          if (packQueryIndex) {
            await savedObjectsClient.update(
              packSavedObjectType,
              currentPackSO.id,
              produce(currentPackSO.attributes, (draftPack) => {
                // @ts-expect-error update types
                draftPack.queries[packQueryIndex] = pickBy({
                  id: queryId,
                  platform,
                  query,
                  version,
                  interval,
                  ecs_mapping: ecs_mapping ? normalizedEcsMapping : null,
                });

                return draftPack;
              }),
              {
                references: produce(currentPackSO.references, (draft) => {
                  if (currentSavedQuerySO.attributes.id !== queryId) {
                    draft = filter(
                      draft,
                      (reference) =>
                        !(
                          reference.id === request.params.id &&
                          reference.type === savedQuerySavedObjectType
                        )
                    );
                    draft.push({
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
                  produce<PackagePolicy>(packagePolicy, (draft) => {
                    unset(draft, 'id');

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
                      pickBy({
                        platform,
                        query,
                        version,
                        interval,
                        ecs_mapping,
                      })
                    );
                    return draft;
                  })
                )
              )
            );
          } else {
            await savedObjectsClient.update(
              packSavedObjectType,
              currentPackSO.id,
              {},
              {
                references: produce(currentPackSO.references, (draft) => {
                  draft = filter(
                    draft,
                    (reference) =>
                      !(
                        reference.id === request.params.id &&
                        reference.type === savedQuerySavedObjectType
                      )
                  );
                  return draft;
                }),
              }
            );
          }
        })
      );

      return response.ok({
        body: updatedSavedQuerySO,
      });
    }
  );
};
