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

export function registerCreateRoute({ router, lib }: RouteDependencies) {
  router.post(
    { path: addBasePath('/index_templates'), validate: { body: bodySchema, query: querySchema } },
    async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { include_type_name } = req.query as TypeOf<typeof querySchema>;
      const template = req.body as TemplateDeserialized;
      const {
        _kbnMeta: { isLegacy },
      } = template;

      // Check that template with the same name doesn't already exist
      const templateExists = await doesTemplateExist({
        name: template.name,
        callAsCurrentUser,
        isLegacy,
      });

      if (templateExists) {
        return res.conflict({
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

      try {
        // Otherwise create new index template
        const response = await saveTemplate({
          template,
          callAsCurrentUser,
          isLegacy,
          include_type_name,
        });

        return res.ok({ body: response });
      } catch (e) {
        if (lib.isEsError(e)) {
          const error = lib.parseEsError(e.response);
          return res.customError({
            statusCode: e.statusCode,
            body: {
              message: error.message,
              attributes: error,
            },
          });
        }
        // Case: default
        throw e;
      }
    }
  );
}
