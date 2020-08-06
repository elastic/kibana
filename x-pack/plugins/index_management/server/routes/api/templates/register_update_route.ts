/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

import { TemplateDeserialized } from '../../../../common';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { templateSchema } from './validate_schemas';
import { saveTemplate, doesTemplateExist } from './lib';

const bodySchema = templateSchema;
const paramsSchema = schema.object({
  name: schema.string(),
});
const querySchema = schema.object({
  include_type_name: schema.maybe(schema.string()),
});

export function registerUpdateRoute({ router, license, lib }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/index_templates/{name}'),
      validate: { body: bodySchema, params: paramsSchema, query: querySchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;
      const { name } = req.params as typeof paramsSchema.type;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { include_type_name } = req.query as TypeOf<typeof querySchema>;
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
        const response = await saveTemplate({
          template,
          callAsCurrentUser,
          isLegacy,
          include_type_name,
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
