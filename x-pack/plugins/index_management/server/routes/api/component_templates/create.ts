/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const bodySchema = schema.object({
  name: schema.string(),
  template: schema.object({
    settings: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    aliases: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    mappings: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  }),
  version: schema.maybe(schema.number()),
  _meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
});

export const registerCreateRoute = ({
  router,
  license,
  lib: { isEsError },
}: RouteDependencies): void => {
  router.post(
    {
      path: addBasePath('/component_templates'),
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;

      const { name, ...componentTemplateDefinition } = req.body;

      try {
        // Check that a component template with the same name doesn't already exist
        const componentTemplateResponse = await callAsCurrentUser(
          'dataManagement.getComponentTemplate',
          { name }
        );

        const { component_templates: componentTemplates } = componentTemplateResponse;

        if (componentTemplates.length && componentTemplates[0].name) {
          return res.conflict({
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
        const response = await callAsCurrentUser('dataManagement.saveComponentTemplate', {
          name,
          body: componentTemplateDefinition,
        });

        return res.ok({ body: response });
      } catch (error) {
        if (isEsError(error)) {
          return res.customError({
            statusCode: error.statusCode,
            body: error,
          });
        }

        return res.internalError({ body: error });
      }
    })
  );
};
