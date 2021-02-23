/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, map } from 'lodash/fp';
import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { savedQuerySavedObjectType, packSavedObjectType } from '../../../common/types';

export const readPackRoute = (router: IRouter) => {
  router.get(
    {
      path: '/internal/osquery/pack/{id}',
      validate: {
        params: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async (context, request, response) => {
      const savedObjectsClient = context.core.savedObjects.client;

      const { attributes, references, ...rest } = await savedObjectsClient.get<{
        name: string;
        description: string;
        queries: Array<{ name: string; interval: string }>;
      }>(
        packSavedObjectType,
        // @ts-expect-error update types
        request.params.id
      );

      const queries =
        attributes.queries?.map((packQuery) => {
          const queryReference = find(['name', packQuery.name], references);

          if (queryReference) {
            return {
              ...packQuery,
              id: queryReference?.id,
            };
          }

          return packQuery;
        }) ?? [];

      const queriesIds = map('id', queries);

      const { saved_objects: savedQueries } = await savedObjectsClient.bulkGet<{}>(
        queriesIds.map((queryId) => ({
          type: savedQuerySavedObjectType,
          id: queryId,
        }))
      );

      // @ts-expect-error update types
      const queriesWithQueries = queries.reduce((acc, query) => {
        // @ts-expect-error update types
        const querySavedObject = find(['id', query.id], savedQueries);
        // @ts-expect-error update types
        if (querySavedObject?.attributes?.query) {
          return [
            ...acc,
            {
              ...query,
              // @ts-expect-error update types
              query: querySavedObject.attributes.query,
            },
          ];
        }

        return acc;
      }, []);

      return response.ok({
        body: {
          ...rest,
          ...attributes,
          queries: queriesWithQueries,
        },
      });
    }
  );
};
