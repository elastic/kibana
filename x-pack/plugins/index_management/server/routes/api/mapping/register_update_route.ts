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

const bodySchema = templateSchema;
const paramsSchema = schema.object({
  name: schema.string(),
});

export function registerUpdateMappingRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/mapping/{name}'),
      validate: { body: bodySchema, params: paramsSchema },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { name } = request.params as typeof paramsSchema.type;
      const mapping = request.body as TemplateDeserialized;
      console.log(mapping);
      try {
        // Verify the template exists (ES will throw 404 if not)
        // const templateExists = await doesTemplateExist({ name, client, isLegacy });

        // if (!templateExists) {
        //   return response.notFound();
        // }

        // Next, update index template

        const indices = (
          await client.asCurrentUser.cat.indices({
            index: name,
          })
        )
          .split('\n')
          .map((i) => i.split(' ')[2])
          .filter((i) => i);
        console.log(indices);
        for (const index of indices) {
          console.log(index);
          const indexMapping = (await client.asCurrentUser.indices.getMapping({ index }))[index]
            .mappings;
          console.log(indexMapping);
          if (mapping.properties) {
            indexMapping.properties = { ...indexMapping.properties, ...mapping.properties };
          } else if (mapping.runtime) {
            indexMapping.runtime = { ...indexMapping.runtime, ...mapping.runtime };
          }
          console.log(indexMapping);
          const r = await client.asCurrentUser.indices.putMapping({
            index,
            body: indexMapping,
          });
          console.log(r);
        }

        return response.ok();
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
