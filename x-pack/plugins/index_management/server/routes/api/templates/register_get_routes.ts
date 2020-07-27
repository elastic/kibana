/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

import {
  deserializeTemplate,
  deserializeTemplateList,
  deserializeLegacyTemplate,
  deserializeLegacyTemplateList,
} from '../../../../common/lib';
import { getCloudManagedTemplatePrefix } from '../../../lib/get_managed_templates';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

export function registerGetAllRoute({ router, license }: RouteDependencies) {
  router.get(
    { path: addBasePath('/index_templates'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.dataManagement!.client;
      const cloudManagedTemplatePrefix = await getCloudManagedTemplatePrefix(callAsCurrentUser);

      const legacyTemplatesEs = await callAsCurrentUser('indices.getTemplate');
      const { index_templates: templatesEs } = await callAsCurrentUser(
        'dataManagement.getComposableIndexTemplates'
      );

      const legacyTemplates = deserializeLegacyTemplateList(
        legacyTemplatesEs,
        cloudManagedTemplatePrefix
      );
      const templates = deserializeTemplateList(templatesEs, cloudManagedTemplatePrefix);

      const body = {
        templates,
        legacyTemplates,
      };

      return res.ok({ body });
    })
  );
}

const paramsSchema = schema.object({
  name: schema.string(),
});

// Require the template format version (V1 or V2) to be provided as Query param
const querySchema = schema.object({
  legacy: schema.maybe(schema.oneOf([schema.literal('true'), schema.literal('false')])),
});

export function registerGetOneRoute({ router, license, lib }: RouteDependencies) {
  router.get(
    {
      path: addBasePath('/index_templates/{name}'),
      validate: { params: paramsSchema, query: querySchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { name } = req.params as TypeOf<typeof paramsSchema>;
      const { callAsCurrentUser } = ctx.dataManagement!.client;

      const isLegacy = (req.query as TypeOf<typeof querySchema>).legacy === 'true';

      try {
        const cloudManagedTemplatePrefix = await getCloudManagedTemplatePrefix(callAsCurrentUser);

        if (isLegacy) {
          const indexTemplateByName = await callAsCurrentUser('indices.getTemplate', { name });

          if (indexTemplateByName[name]) {
            return res.ok({
              body: deserializeLegacyTemplate(
                { ...indexTemplateByName[name], name },
                cloudManagedTemplatePrefix
              ),
            });
          }
        } else {
          const {
            index_templates: indexTemplates,
          } = await callAsCurrentUser('dataManagement.getComposableIndexTemplate', { name });

          if (indexTemplates.length > 0) {
            return res.ok({
              body: deserializeTemplate(
                { ...indexTemplates[0].index_template, name },
                cloudManagedTemplatePrefix
              ),
            });
          }
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
