/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

import {
  deserializeLegacyTemplate,
  deserializeLegacyTemplateList,
  deserializeTemplateList,
} from '../../../../common/lib';
import { getManagedTemplatePrefix } from '../../../lib/get_managed_templates';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

export function registerGetAllRoute({ router, license }: RouteDependencies) {
  router.get(
    { path: addBasePath('/index_templates'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;
      const managedTemplatePrefix = await getManagedTemplatePrefix(callAsCurrentUser);

      const _legacyTemplates = await callAsCurrentUser('indices.getTemplate');
      const { index_templates: _templates } = await callAsCurrentUser('transport.request', {
        path: '_index_template',
        method: 'GET',
      });

      const legacyTemplates = deserializeLegacyTemplateList(
        _legacyTemplates,
        managedTemplatePrefix
      );
      const templates = deserializeTemplateList(_templates, managedTemplatePrefix);

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
  legacy: schema.maybe(schema.boolean()),
});

export function registerGetOneRoute({ router, license, lib }: RouteDependencies) {
  router.get(
    {
      path: addBasePath('/index_templates/{name}'),
      validate: { params: paramsSchema, query: querySchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { name } = req.params as TypeOf<typeof paramsSchema>;
      const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;

      const { legacy } = req.query as TypeOf<typeof querySchema>;

      if (!legacy) {
        return res.badRequest({ body: 'Only index template version 1 can be fetched.' });
      }

      try {
        const managedTemplatePrefix = await getManagedTemplatePrefix(callAsCurrentUser);
        const indexTemplateByName = await callAsCurrentUser('indices.getTemplate', { name });

        if (indexTemplateByName[name]) {
          return res.ok({
            body: deserializeLegacyTemplate(
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
