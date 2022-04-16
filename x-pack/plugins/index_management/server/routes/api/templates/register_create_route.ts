/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { TemplateDeserialized } from '../../../../common';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';
import { templateSchema } from './validate_schemas';
import { saveTemplate, doesTemplateExist } from './lib';

const bodySchema = templateSchema;

export function registerCreateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    { path: addBasePath('/index_templates'), validate: { body: bodySchema } },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      const template = request.body as TemplateDeserialized;

      try {
        const {
          _kbnMeta: { isLegacy },
        } = template;

        // Check that template with the same name doesn't already exist
        const templateExists = await doesTemplateExist({
          name: template.name,
          client,
          isLegacy,
        });

        if (templateExists) {
          return response.conflict({
            body: new Error(
              i18n.translate('xpack.idxMgmt.createRoute.duplicateTemplateIdErrorMessage', {
                defaultMessage: "There is already a template with name '{name}'.",
                values: {
                  name: template.name,
                },
              })
            ),
          });
        }

        // Otherwise create new index template
        const responseBody = await saveTemplate({ template, client, isLegacy });

        return response.ok({ body: responseBody });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
