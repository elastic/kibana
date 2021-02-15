/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash/fp';
import { schema } from '@kbn/config-schema';

import { IRouter } from '../../../../../../src/core/server';
import { packSavedObjectType } from '../../../common/types';

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
        title: string;
        description: string;
        queries: Array<{ name: string; interval: string }>;
      }>(
        packSavedObjectType,
        // @ts-expect-error update types
        request.params.id
      );

      return response.ok({
        body: {
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
        },
      });
    }
  );
};
