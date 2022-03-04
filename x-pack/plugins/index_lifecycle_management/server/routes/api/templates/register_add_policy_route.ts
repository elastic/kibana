/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { ElasticsearchClient } from 'kibana/server';
import { i18n } from '@kbn/i18n';

import { TemplateFromEs, TemplateSerialized } from '../../../../../index_management/common/types';
import { LegacyTemplateSerialized } from '../../../../../index_management/server';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

async function getLegacyIndexTemplate(
  client: ElasticsearchClient,
  templateName: string
): Promise<LegacyTemplateSerialized | undefined> {
  const response = await client.indices.getTemplate({ name: templateName });
  return response[templateName];
}

async function getIndexTemplate(
  client: ElasticsearchClient,
  templateName: string
): Promise<TemplateSerialized | undefined> {
  const options = {
    // we allow 404 incase the user shutdown security in-between the check and now
    ignore: [404],
  };

  const response = await client.indices.getIndexTemplate(
    {
      name: templateName,
    },
    options
  );

  const { index_templates: templates } = response as {
    index_templates: TemplateFromEs[];
  };
  return templates.find((template) => template.name === templateName)?.index_template;
}

async function updateIndexTemplate(
  client: ElasticsearchClient,
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
    ? await getLegacyIndexTemplate(client, templateName)
    : await getIndexTemplate(client, templateName);
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

  if (isLegacy) {
    return client.indices.putTemplate({ name: templateName, body: indexTemplate });
  }
  // @ts-expect-error Type 'IndexSettings' is not assignable to type 'IndicesIndexSettings'.
  return client.indices.putIndexTemplate({ name: templateName, body: indexTemplate });
}

const bodySchema = schema.object({
  templateName: schema.string(),
  policyName: schema.string(),
  aliasName: schema.maybe(schema.string()),
});

const querySchema = schema.object({
  legacy: schema.maybe(schema.oneOf([schema.literal('true'), schema.literal('false')])),
});

export function registerAddPolicyRoute({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) {
  router.post(
    { path: addBasePath('/template'), validate: { body: bodySchema, query: querySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const body = request.body as typeof bodySchema.type;
      const { templateName, policyName, aliasName } = body;
      const isLegacy = (request.query as TypeOf<typeof querySchema>).legacy === 'true';
      try {
        const updatedTemplate = await updateIndexTemplate(
          context.core.elasticsearch.client.asCurrentUser,
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
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
