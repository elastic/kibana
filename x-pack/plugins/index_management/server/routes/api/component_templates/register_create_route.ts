/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { serializeComponentTemplate } from '../../../../common/lib';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { componentTemplateSchema } from './schema_validation';

export const registerCreateRoute = ({
  router,
  lib: { handleEsError },
}: RouteDependencies): void => {
  router.post(
    {
      path: addBasePath('/component_templates'),
      validate: {
        body: componentTemplateSchema,
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      const serializedComponentTemplate = serializeComponentTemplate(request.body);

      const { name } = request.body;

      try {
        // Check that a component template with the same name doesn't already exist
        const { component_templates: componentTemplates } =
          await client.asCurrentUser.cluster.getComponentTemplate({
            name,
          });

        if (componentTemplates.length) {
          return response.conflict({
            body: new Error(
              i18n.translate('xpack.idxMgmt.componentTemplates.createRoute.duplicateErrorMessage', {
                defaultMessage: "There is already a component template with name '{name}'.",
                values: {
                  name,
                },
              })
            ),
          });
        }
      } catch (e) {
        // Silently swallow error
      }

      try {
        const responseBody = await client.asCurrentUser.cluster.putComponentTemplate({
          name,
          // @ts-expect-error ComponentTemplateSerialized conflicts with @elastic/elasticsearch ClusterPutComponentTemplateRequest
          body: serializedComponentTemplate,
        });

        return response.ok({ body: responseBody });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
};
