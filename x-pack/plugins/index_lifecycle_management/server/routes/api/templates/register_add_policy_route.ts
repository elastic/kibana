/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { LegacyAPICaller } from 'src/core/server';
import { i18n } from '@kbn/i18n';

import { TemplateFromEs, TemplateSerialized } from '../../../../../index_management/common/types';
import { LegacyTemplateSerialized } from '../../../../../index_management/server';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function getLegacyIndexTemplate(
  callAsCurrentUser: LegacyAPICaller,
  templateName: string
): Promise<LegacyTemplateSerialized | undefined> {
  const response = await callAsCurrentUser('indices.getTemplate', { name: templateName });
  return response[templateName];
}

async function getIndexTemplate(
  callAsCurrentUser: LegacyAPICaller,
  templateName: string
): Promise<TemplateSerialized | undefined> {
  const params = {
    method: 'GET',
    path: `/_index_template/${encodeURIComponent(templateName)}`,
    // we allow 404 incase the user shutdown security in-between the check and now
    ignore: [404],
  };

  const { index_templates: templates } = await callAsCurrentUser<{
    index_templates: TemplateFromEs[];
  }>('transport.request', params);
  return templates?.find((template) => template.name === templateName)?.index_template;
}

async function updateIndexTemplate(
  callAsCurrentUser: LegacyAPICaller,
  isLegacy: boolean,
  templateName: string,
  policyName: string,
  aliasName?: string
): Promise<any> {
  const settings = {
    index: {
      lifecycle: {
        name: policyName,
        rollover_alias: aliasName,
      },
    },
  };

  const indexTemplate = isLegacy
    ? await getLegacyIndexTemplate(callAsCurrentUser, templateName)
    : await getIndexTemplate(callAsCurrentUser, templateName);
  if (!indexTemplate) {
    return false;
  }
  if (isLegacy) {
    merge(indexTemplate, { settings });
  } else {
    merge(indexTemplate, {
      template: {
        settings,
      },
    });
  }

  const pathPrefix = isLegacy ? '/_template/' : '/_index_template/';
  const params = {
    method: 'PUT',
    path: `${pathPrefix}${encodeURIComponent(templateName)}`,
    ignore: [404],
    body: indexTemplate,
  };

  return await callAsCurrentUser('transport.request', params);
}

const bodySchema = schema.object({
  templateName: schema.string(),
  policyName: schema.string(),
  aliasName: schema.maybe(schema.string()),
});

const querySchema = schema.object({
  legacy: schema.maybe(schema.oneOf([schema.literal('true'), schema.literal('false')])),
});

export function registerAddPolicyRoute({ router, license, lib }: RouteDependencies) {
  router.post(
    { path: addBasePath('/template'), validate: { body: bodySchema, query: querySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const body = request.body as typeof bodySchema.type;
      const { templateName, policyName, aliasName } = body;
      const isLegacy = (request.query as TypeOf<typeof querySchema>).legacy === 'true';
      try {
        const updatedTemplate = await updateIndexTemplate(
          context.core.elasticsearch.legacy.client.callAsCurrentUser,
          isLegacy,
          templateName,
          policyName,
          aliasName
        );
        if (!updatedTemplate) {
          return response.notFound({
            body: i18n.translate('xpack.indexLifecycleMgmt.templateNotFoundMessage', {
              defaultMessage: `Template {name} not found.`,
              values: {
                name: templateName,
              },
            }),
          });
        }
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
