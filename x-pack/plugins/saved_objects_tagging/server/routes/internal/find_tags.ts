/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { tagsInternalApiPrefix, tagSavedObjectTypeName } from '../../../common/constants';
import { TagAttributes } from '../../../common/types';

export const registerInternalFindTagsRoute = (router: IRouter) => {
  router.get(
    {
      path: `${tagsInternalApiPrefix}/_find`,
      validate: {
        query: schema.object({
          perPage: schema.number({ min: 0, defaultValue: 20 }),
          page: schema.number({ min: 0, defaultValue: 1 }),
          search: schema.maybe(schema.string()),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { query } = req;
      const { client } = ctx.core.savedObjects;

      const findResponse = await client.find<TagAttributes>({
        page: query.page,
        perPage: query.perPage,
        search: query.search,
        type: [tagSavedObjectTypeName],
        searchFields: ['title', 'description'],
      });

      // TODO: get number of connections and enhance the response

      return res.ok({
        body: {
          tags: findResponse.saved_objects,
          total: findResponse.total,
        },
      });
    })
  );
};
