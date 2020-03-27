/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { APICaller } from 'src/core/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function fetchTemplate(callAsCurrentUser: APICaller, templateName: string): Promise<any> {
  const params = {
    method: 'GET',
    path: `/_template/${encodeURIComponent(templateName)}`,
    // we allow 404 incase the user shutdown security in-between the check and now
    ignore: [404],
  };

  return await callAsCurrentUser('transport.request', params);
}

const paramsSchema = schema.object({
  templateName: schema.string(),
});

export function registerGetRoute({ router, license, lib }: RouteDependencies) {
  router.get(
    { path: addBasePath('/templates/{templateName}'), validate: { params: paramsSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const params = req.params as typeof paramsSchema.type;
      const { templateName } = params;

      try {
        const template = await fetchTemplate(
          ctx.core.elasticsearch.dataClient.callAsCurrentUser,
          templateName
        );
        const okResponse = { body: template[templateName] };
        return res.ok(okResponse);
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
