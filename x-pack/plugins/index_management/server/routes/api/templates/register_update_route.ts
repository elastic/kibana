/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { TemplateDeserialized } from '../../../../common';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { templateSchema } from './validate_schemas';
import { saveTemplate, doesTemplateExist } from './lib';

const bodySchema = templateSchema;
const paramsSchema = schema.object({
  name: schema.string(),
});

export function registerUpdateRoute({ router, license, lib }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/index_templates/{name}'),
      validate: { body: bodySchema, params: paramsSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;
      const { name } = req.params as typeof paramsSchema.type;
      const template = req.body as TemplateDeserialized;
      const {
        _kbnMeta: { isLegacy },
      } = template;

      // Verify the template exists (ES will throw 404 if not)
      const doesExist = await doesTemplateExist({ name, callAsCurrentUser, isLegacy });

      if (!doesExist) {
        return res.notFound();
      }

      try {
        // Next, update index template
        const response = await saveTemplate({ template, callAsCurrentUser, isLegacy });

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
    })
  );
}
