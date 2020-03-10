/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { Template, TemplateEs } from '../../../../common/types';
import { serializeTemplate } from '../../../../common/lib';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { templateSchema } from './validate_schemas';

const bodySchema = templateSchema;
const paramsSchema = schema.object({
  name: schema.string(),
});

export function registerUpdateRoute({ router, license, lib }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/templates/{name}'),
      validate: { body: bodySchema, params: paramsSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.dataClient;
      const { name } = req.params as typeof paramsSchema.type;
      const template = req.body as Template;
      const serializedTemplate = serializeTemplate(template) as TemplateEs;

      const { order, index_patterns, version, settings, mappings, aliases } = serializedTemplate;

      // Verify the template exists (ES will throw 404 if not)
      const doesExist = await callAsCurrentUser('indices.existsTemplate', { name });

      if (!doesExist) {
        return res.notFound();
      }

      try {
        // Next, update index template
        const response = await callAsCurrentUser('indices.putTemplate', {
          name,
          order,
          body: {
            index_patterns,
            version,
            settings,
            mappings,
            aliases,
          },
        });

        return res.ok({ body: response });
      } catch (e) {
        if (lib.isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );
}
