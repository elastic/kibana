/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  deserializeComponentTemplate,
  deserializeComponentTemplateList,
} from '../../../../common/lib';
import { ComponentTemplateFromEs } from '../../../../common';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const paramsSchema = schema.object({
  name: schema.string(),
});

export function registerGetAllRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  // Get all component templates
  router.get(
    { path: addBasePath('/component_templates'), validate: false },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;

      try {
        const {
          body: { component_templates: componentTemplates },
        } = await client.asCurrentUser.cluster.getComponentTemplate();

        const {
          body: { index_templates: indexTemplates },
        } = await client.asCurrentUser.indices.getIndexTemplate();

        const body = componentTemplates.map((componentTemplate: ComponentTemplateFromEs) => {
          const deserializedComponentTemplateListItem = deserializeComponentTemplateList(
            componentTemplate,
            indexTemplates
          );
          return deserializedComponentTemplateListItem;
        });

        return response.ok({ body });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );

  // Get single component template
  router.get(
    {
      path: addBasePath('/component_templates/{name}'),
      validate: {
        params: paramsSchema,
      },
    },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const { name } = request.params;

      try {
        const {
          body: { component_templates: componentTemplates },
        } = await client.asCurrentUser.cluster.getComponentTemplate({
          name,
        });

        const {
          body: { index_templates: indexTemplates },
        } = await client.asCurrentUser.indices.getIndexTemplate();

        return response.ok({
          body: deserializeComponentTemplate(componentTemplates[0], indexTemplates),
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
