/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import {
  deserializeTemplate,
  deserializeTemplateList,
  deserializeLegacyTemplate,
  deserializeLegacyTemplateList,
} from '../../../../common/lib';
import { getCloudManagedTemplatePrefix } from '../../../lib/get_managed_templates';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

export function registerGetAllRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    { path: addBasePath('/index_templates'), validate: false },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      try {
        const cloudManagedTemplatePrefix = await getCloudManagedTemplatePrefix(client);

        const legacyTemplatesEs = await client.asCurrentUser.indices.getTemplate();
        const { index_templates: templatesEs } =
          await client.asCurrentUser.indices.getIndexTemplate();

        const legacyTemplates = deserializeLegacyTemplateList(
          legacyTemplatesEs,
          cloudManagedTemplatePrefix
        );
        // @ts-expect-error TemplateSerialized.index_patterns not compatible with IndicesIndexTemplate.index_patterns
        const templates = deserializeTemplateList(templatesEs, cloudManagedTemplatePrefix);

        const body = {
          templates,
          legacyTemplates,
        };

        return response.ok({ body });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}

const paramsSchema = schema.object({
  name: schema.string(),
});

// Require the template format version (V1 or V2) to be provided as Query param
const querySchema = schema.object({
  legacy: schema.maybe(schema.oneOf([schema.literal('true'), schema.literal('false')])),
});

export function registerGetOneRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: addBasePath('/index_templates/{name}'),
      validate: { params: paramsSchema, query: querySchema },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { name } = request.params as TypeOf<typeof paramsSchema>;
      const isLegacy = (request.query as TypeOf<typeof querySchema>).legacy === 'true';

      try {
        const cloudManagedTemplatePrefix = await getCloudManagedTemplatePrefix(client);

        if (isLegacy) {
          const indexTemplateByName = await client.asCurrentUser.indices.getTemplate({
            name,
          });

          if (indexTemplateByName[name]) {
            return response.ok({
              body: deserializeLegacyTemplate(
                { ...indexTemplateByName[name], name },
                cloudManagedTemplatePrefix
              ),
            });
          }
        } else {
          const { index_templates: indexTemplates } =
            await client.asCurrentUser.indices.getIndexTemplate({ name });

          if (indexTemplates.length > 0) {
            return response.ok({
              body: deserializeTemplate(
                // @ts-expect-error TemplateSerialized.index_patterns not compatible with IndicesIndexTemplate.index_patterns
                { ...indexTemplates[0].index_template, name },
                cloudManagedTemplatePrefix
              ),
            });
          }
        }

        return response.notFound();
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
