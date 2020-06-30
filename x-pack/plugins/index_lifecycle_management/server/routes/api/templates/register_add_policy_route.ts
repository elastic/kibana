/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';
import { schema } from '@kbn/config-schema';
import { LegacyAPICaller } from 'src/core/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function getIndexTemplate(
  callAsCurrentUser: LegacyAPICaller,
  templateName: string
): Promise<any> {
  const response = await callAsCurrentUser('indices.getTemplate', { name: templateName });
  return response[templateName];
}

async function updateIndexTemplate(
  callAsCurrentUser: LegacyAPICaller,
  templateName: string,
  policyName: string,
  aliasName?: string
): Promise<any> {
  // Fetch existing template
  const template = await getIndexTemplate(callAsCurrentUser, templateName);
  merge(template, {
    settings: {
      index: {
        lifecycle: {
          name: policyName,
          rollover_alias: aliasName,
        },
      },
    },
  });

  const params = {
    method: 'PUT',
    path: `/_template/${encodeURIComponent(templateName)}`,
    ignore: [404],
    body: template,
  };

  return await callAsCurrentUser('transport.request', params);
}

const bodySchema = schema.object({
  templateName: schema.string(),
  policyName: schema.string(),
  aliasName: schema.maybe(schema.string()),
});

export function registerAddPolicyRoute({ router, license, lib }: RouteDependencies) {
  router.post(
    { path: addBasePath('/template'), validate: { body: bodySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const body = request.body as typeof bodySchema.type;
      const { templateName, policyName, aliasName } = body;

      try {
        await updateIndexTemplate(
          context.core.elasticsearch.legacy.client.callAsCurrentUser,
          templateName,
          policyName,
          aliasName
        );
        return response.ok();
      } catch (e) {
        if (lib.isEsError(e)) {
          return response.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return response.internalError({ body: e });
      }
    })
  );
}
