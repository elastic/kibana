/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, has, map } from 'lodash';
import { schema } from '@kbn/config-schema';

import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../fleet/common';
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

      const { items: packagePolicies } = await packagePolicyService?.list(savedObjectsClient, {
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
        perPage: 1000,
        page: 1,
      });

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
        const packName = pack.attributes.name;

        const policyIds = map(
          filter(packagePolicies, (packagePolicy) =>
            has(packagePolicy, `inputs[0].config.osquery.value.packs.${packName}`)
          ),
          'policy_id'
        );

        pack.policy_ids = policyIds;
        return pack;
      });

      // const packs = soClientResponse.saved_objects.map(({ attributes, references, ...rest }) => ({
      //   ...rest,
      //   ...attributes,
      //   queries:
      //     attributes.queries?.map((packQuery) => {
      //       const queryReference = find(['name', packQuery.name], references);

      //       if (queryReference) {
      //         return {
      //           ...packQuery,
      //           id: queryReference?.id,
      //         };
      //       }

      //       return packQuery;
      //     }) ?? [],
      // }));

      // const savedQueriesIds = uniq<string>(
      //   // @ts-expect-error update types
      //   packs.reduce((acc, savedQuery) => [...acc, ...map('id', savedQuery.queries)], [])
      // );

      // const { saved_objects: savedQueries } = await savedObjectsClient.bulkGet(
      //   savedQueriesIds.map((queryId) => ({
      //     type: savedQuerySavedObjectType,
      //     id: queryId,
      //   }))
      // );

      // const packsWithSavedQueriesQueries = packs.map((pack) => ({
      //   ...pack,
      //   // @ts-expect-error update types
      //   queries: pack.queries.reduce((acc, packQuery) => {
      //     // @ts-expect-error update types
      //     const savedQuerySO = find(['id', packQuery.id], savedQueries);

      //     // @ts-expect-error update types
      //     if (savedQuerySO?.attributes?.query) {
      //       return [
      //         ...acc,
      //         {
      //           ...packQuery,
      //           // @ts-expect-error update types
      //           query: find(['id', packQuery.id], savedQueries).attributes.query,
      //         },
      //       ];
      //     }

      //     return acc;
      //   }, []),
      // }));

      return response.ok({
        body: {
          ...soClientResponse,
          // items: packsWithSavedQueriesQueries,
        },
      });
    }
  );
};
