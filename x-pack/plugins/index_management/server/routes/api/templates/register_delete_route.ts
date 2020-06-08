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
      isLegacy: schema.maybe(schema.boolean()),
    })
  ),
});

export function registerDeleteRoute({ router, license }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/delete-index-templates'),
      validate: { body: bodySchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { templates } = req.body as TypeOf<typeof bodySchema>;
      const response: { templatesDeleted: Array<TemplateDeserialized['name']>; errors: any[] } = {
        templatesDeleted: [],
        errors: [],
      };

      await Promise.all(
        templates.map(async ({ name, isLegacy }) => {
          try {
            if (!isLegacy) {
              return res.badRequest({ body: 'Only legacy index template can be deleted.' });
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
