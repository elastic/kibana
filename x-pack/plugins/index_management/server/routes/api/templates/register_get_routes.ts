/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { deserializeTemplate, deserializeTemplateList } from '../../../../common/lib';
import { getManagedTemplatePrefix } from '../../../lib/get_managed_templates';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

export function registerGetAllRoute({ router, license }: RouteDependencies) {
  router.get(
    { path: addBasePath('/templates'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.dataClient;
      const managedTemplatePrefix = await getManagedTemplatePrefix(callAsCurrentUser);

      const indexTemplatesByName = await callAsCurrentUser('indices.getTemplate');

      return res.ok({ body: deserializeTemplateList(indexTemplatesByName, managedTemplatePrefix) });
    })
  );
}

const paramsSchema = schema.object({
  name: schema.string(),
});

export function registerGetOneRoute({ router, license, lib }: RouteDependencies) {
  router.get(
    { path: addBasePath('/templates/{name}'), validate: { params: paramsSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { name } = req.params as typeof paramsSchema.type;
      const { callAsCurrentUser } = ctx.core.elasticsearch.dataClient;

      try {
        const managedTemplatePrefix = await getManagedTemplatePrefix(callAsCurrentUser);
        const indexTemplateByName = await callAsCurrentUser('indices.getTemplate', { name });

        if (indexTemplateByName[name]) {
          return res.ok({
            body: deserializeTemplate(
              { ...indexTemplateByName[name], name },
              managedTemplatePrefix
            ),
          });
        }

        return res.notFound();
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
