/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { TemplateDeserialized } from '../../../../common';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { templateSchema } from './validate_schemas';
import { saveTemplate, doesTemplateExist } from './lib';

const bodySchema = templateSchema;
const paramsSchema = schema.object({
  name: schema.string(),
});
const querySchema = schema.object({
  include_type_name: schema.maybe(schema.string()),
});

export function registerUpdateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/index_templates/{name}'),
      validate: { body: bodySchema, params: paramsSchema, query: querySchema },
    },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const { name } = request.params as typeof paramsSchema.type;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { include_type_name } = request.query as TypeOf<typeof querySchema>;
      const template = request.body as TemplateDeserialized;

      try {
        const {
          _kbnMeta: { isLegacy },
        } = template;

        // Verify the template exists (ES will throw 404 if not)
        const { body: templateExists } = await doesTemplateExist({ name, client, isLegacy });

        if (!templateExists) {
          return response.notFound();
        }

        // Next, update index template
        const { body: responseBody } = await saveTemplate({
          template,
          client,
          isLegacy,
          include_type_name: include_type_name === 'true',
        });

        return response.ok({ body: responseBody });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
