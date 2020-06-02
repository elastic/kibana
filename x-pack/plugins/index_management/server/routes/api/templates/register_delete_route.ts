/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { wrapEsError } from '../../helpers';

import { TemplateDeserialized } from '../../../../common';

const bodySchema = schema.object({
  templates: schema.arrayOf(
    schema.object({
      name: schema.string(),
      formatVersion: schema.oneOf([schema.literal(1), schema.literal(2)]),
    })
  ),
});

export function registerDeleteRoute({ router, license }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/delete-templates'),
      validate: { body: bodySchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { templates } = req.body as TypeOf<typeof bodySchema>;
      const response: { templatesDeleted: Array<TemplateDeserialized['name']>; errors: any[] } = {
        templatesDeleted: [],
        errors: [],
      };

      await Promise.all(
        templates.map(async ({ name, formatVersion }) => {
          try {
            if (formatVersion !== 1) {
              return res.badRequest({ body: 'Only index template version 1 can be deleted.' });
            }

            await ctx.core.elasticsearch.legacy.client.callAsCurrentUser('indices.deleteTemplate', {
              name,
            });

            return response.templatesDeleted.push(name);
          } catch (e) {
            return response.errors.push({
              name,
              error: wrapEsError(e),
            });
          }
        })
      );

      return res.ok({ body: response });
    })
  );
}
