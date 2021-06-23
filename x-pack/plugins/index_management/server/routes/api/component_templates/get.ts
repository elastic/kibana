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

export function registerGetAllRoute({ router, lib: { isEsError } }: RouteDependencies) {
  // Get all component templates
  router.get(
    { path: addBasePath('/component_templates'), validate: false },
    async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;

      try {
        const {
          component_templates: componentTemplates,
        }: { component_templates: ComponentTemplateFromEs[] } = await callAsCurrentUser(
          'dataManagement.getComponentTemplates'
        );

        const { index_templates: indexTemplates } = await callAsCurrentUser(
          'dataManagement.getComposableIndexTemplates'
        );

        const body = componentTemplates.map((componentTemplate) => {
          const deserializedComponentTemplateListItem = deserializeComponentTemplateList(
            componentTemplate,
            indexTemplates
          );
          return deserializedComponentTemplateListItem;
        });

        return res.ok({ body });
      } catch (error) {
        if (isEsError(error)) {
          return res.customError({
            statusCode: error.statusCode,
            body: error,
          });
        }

        throw error;
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
    async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;
      const { name } = req.params;

      try {
        const { component_templates: componentTemplates } = await callAsCurrentUser(
          'dataManagement.getComponentTemplates',
          {
            name,
          }
        );

        const { index_templates: indexTemplates } = await callAsCurrentUser(
          'dataManagement.getComposableIndexTemplates'
        );

        return res.ok({
          body: deserializeComponentTemplate(componentTemplates[0], indexTemplates),
        });
      } catch (error) {
        if (isEsError(error)) {
          return res.customError({
            statusCode: error.statusCode,
            body: error,
          });
        }

        throw error;
      }
    }
  );
}
