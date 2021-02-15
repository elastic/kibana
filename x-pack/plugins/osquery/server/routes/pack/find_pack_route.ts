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
        title: string;
        description: string;
        queries: Array<{ name: string; interval: string }>;
      }>({
        type: packSavedObjectType,
        // @ts-expect-error update types
        page: parseInt(request.query.pageIndex, 10) + 1,
        // @ts-expect-error update types
        perPage: request.query.pageSize,
        // @ts-expect-error update types
        sortField: request.query.sortField,
        // @ts-expect-error update types
        sortOrder: request.query.sortDirection,
      });

      return response.ok({
        body: {
          ...soClientResponse,
          saved_objects: soClientResponse.saved_objects.map(
            ({ attributes, references, ...rest }) => ({
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
            })
          ),
        },
      });
    }
  );
};
