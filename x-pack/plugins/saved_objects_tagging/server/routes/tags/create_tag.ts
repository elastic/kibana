/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { TagValidationError } from '../../services/tags';

export const registerCreateTagRoute = (router: IRouter) => {
  router.post(
    {
      path: '/api/saved_objects_tagging/tags/create',
      validate: {
        body: schema.object({
          name: schema.string(),
          description: schema.string(),
          color: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      try {
        const tag = await ctx.tags!.tagsClient.create(req.body);
        return res.ok({
          body: {
            tag,
          },
        });
      } catch (e) {
        if (e instanceof TagValidationError) {
          return res.badRequest({
            body: {
              message: e.message,
              attributes: e.validation,
            },
          });
        }
        throw e;
      }
    })
  );
};
