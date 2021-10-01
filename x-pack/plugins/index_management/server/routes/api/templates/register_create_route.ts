/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';

import { TemplateDeserialized } from '../../../../common';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { templateSchema } from './validate_schemas';
import { saveTemplate, doesTemplateExist } from './lib';

const bodySchema = templateSchema;
const querySchema = schema.object({
  include_type_name: schema.maybe(schema.string()),
});

export function registerCreateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    { path: addBasePath('/index_templates'), validate: { body: bodySchema, query: querySchema } },
    async (context, request, response) => {
      const { client } = context.core.elasticsearch;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { include_type_name } = request.query as TypeOf<typeof querySchema>;
      const template = request.body as TemplateDeserialized;

      try {
        const {
          _kbnMeta: { isLegacy },
        } = template;

        // Check that template with the same name doesn't already exist
        const { body: templateExists } = await doesTemplateExist({
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
