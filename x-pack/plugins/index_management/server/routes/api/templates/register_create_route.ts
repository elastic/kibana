/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { TemplateDeserialized } from '../../../../common';
import { serializeV1Template } from '../../../../common/lib';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { templateSchema } from './validate_schemas';

const bodySchema = templateSchema;

export function registerCreateRoute({ router, license, lib }: RouteDependencies) {
  router.put(
    { path: addBasePath('/templates'), validate: { body: bodySchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;
      const template = req.body as TemplateDeserialized;
      const {
        _kbnMeta: { formatVersion },
      } = template;

      if (formatVersion !== 1) {
        return res.badRequest({ body: 'Only index template version 1 can be created.' });
      }

      // For now we format to V1 index templates.
      // When the V2 API is ready we will only create V2 template format.
      const serializedTemplate = serializeV1Template(template);

      const {
        name,
        order,
        index_patterns,
        version,
        settings,
        mappings,
        aliases,
      } = serializedTemplate;

      // Check that template with the same name doesn't already exist
      const templateExists = await callAsCurrentUser('indices.existsTemplate', { name });

      if (templateExists) {
        return res.conflict({
          body: new Error(
            i18n.translate('xpack.idxMgmt.createRoute.duplicateTemplateIdErrorMessage', {
              defaultMessage: "There is already a template with name '{name}'.",
              values: {
                name,
              },
            })
          ),
        });
      }

      try {
        // Otherwise create new index template
        const response = await callAsCurrentUser('indices.putTemplate', {
          name,
          order,
          body: {
            index_patterns,
            version,
            settings,
            mappings,
            aliases,
          },
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
