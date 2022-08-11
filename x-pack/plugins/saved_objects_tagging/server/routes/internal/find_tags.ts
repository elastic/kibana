/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TagsPluginRouter } from '../../types';
import { tagSavedObjectTypeName } from '../../../common/constants';
import { TagAttributes } from '../../../common/types';
import { savedObjectToTag } from '../../services/tags';
import { addConnectionCount } from '../lib';

export const registerInternalFindTagsRoute = (router: TagsPluginRouter) => {
  router.get(
    {
      path: '/internal/saved_objects_tagging/tags/_find',
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
      const { client, typeRegistry } = (await ctx.core).savedObjects;

      const findResponse = await client.find<TagAttributes>({
        page: query.page,
        perPage: query.perPage,
        search: query.search,
        type: [tagSavedObjectTypeName],
        searchFields: ['title', 'description'],
      });

      const tags = findResponse.saved_objects.map(savedObjectToTag);
      const allTypes = typeRegistry.getAllTypes().map((type) => type.name);

      const tagsWithConnections = await addConnectionCount(tags, allTypes, client);

      return res.ok({
        body: {
          tags: tagsWithConnections,
          total: findResponse.total,
        },
      });
    })
  );
};
