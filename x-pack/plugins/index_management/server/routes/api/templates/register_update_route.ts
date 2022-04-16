/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { TemplateDeserialized } from '../../../../common';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';
import { templateSchema } from './validate_schemas';
import { saveTemplate, doesTemplateExist } from './lib';

const bodySchema = templateSchema;
const paramsSchema = schema.object({
  name: schema.string(),
});

export function registerUpdateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/index_templates/{name}'),
      validate: { body: bodySchema, params: paramsSchema },
    },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const { name } = request.params as typeof paramsSchema.type;
      const template = request.body as TemplateDeserialized;

      try {
        const {
          _kbnMeta: { isLegacy },
        } = template;

        // Verify the template exists (ES will throw 404 if not)
        const templateExists = await doesTemplateExist({ name, client, isLegacy });

        if (!templateExists) {
          return response.notFound();
        }

        // Next, update index template
        const responseBody = await saveTemplate({ template, client, isLegacy });

        return response.ok({ body: responseBody });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
