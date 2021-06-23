/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, map, uniq } from 'lodash/fp';
import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { packSavedObjectType, savedQuerySavedObjectType } from '../../../common/types';

export const findPackRoute = (router: IRouter) => {
  router.get(
    {
      path: '/internal/osquery/pack',
      validate: {
        query: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

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

      const packs = soClientResponse.saved_objects.map(({ attributes, references, ...rest }) => ({
        ...rest,
        ...attributes,
        queries:
          attributes.queries?.map((packQuery) => {
            const queryReference = find(['name', packQuery.name], references);

            if (queryReference) {
              return {
                ...packQuery,
                id: queryReference?.id,
              };
            }

            return packQuery;
          }) ?? [],
      }));

      const savedQueriesIds = uniq<string>(
        // @ts-expect-error update types
        packs.reduce((acc, savedQuery) => [...acc, ...map('id', savedQuery.queries)], [])
      );

      const { saved_objects: savedQueries } = await savedObjectsClient.bulkGet(
        savedQueriesIds.map((queryId) => ({
          type: savedQuerySavedObjectType,
          id: queryId,
        }))
      );

      const packsWithSavedQueriesQueries = packs.map((pack) => ({
        ...pack,
        // @ts-expect-error update types
        queries: pack.queries.reduce((acc, packQuery) => {
          // @ts-expect-error update types
          const savedQuerySO = find(['id', packQuery.id], savedQueries);

          // @ts-expect-error update types
          if (savedQuerySO?.attributes?.query) {
            return [
              ...acc,
              {
                ...packQuery,
                // @ts-expect-error update types
                query: find(['id', packQuery.id], savedQueries).attributes.query,
              },
            ];
          }

          return acc;
        }, []),
      }));

      return response.ok({
        body: {
          ...soClientResponse,
          saved_objects: packsWithSavedQueriesQueries,
        },
      });
    }
  );
};
