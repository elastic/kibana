/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { taggableTypes } from '../../../common/constants';

export const registerUpdateTagsAssignmentsRoute = (router: IRouter) => {
  router.post(
    {
      path: '/api/saved_objects_tagging/assignments/update_by_tags',
      validate: {
        body: schema.object({
          tags: schema.arrayOf(schema.string(), { minSize: 1 }),
          assign: schema.arrayOf(
            schema.object({
              type: schema.string(),
              id: schema.string(),
            })
          ),
          unassign: schema.arrayOf(
            schema.object({
              type: schema.string(),
              id: schema.string(),
            })
          ),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      // const { query } = req;
      // const { client, typeRegistry } = ctx.core.savedObjects;

      // TODO: filter types based on taggable status
      // TODO: filter types based on user permissions
      // TODO: update objects

      return res.ok({
        body: { taggableTypes },
      });
    })
  );
};
