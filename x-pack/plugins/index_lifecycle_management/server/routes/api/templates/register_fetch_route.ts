/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import {
  IndexSettings,
  LegacyTemplateSerialized,
  TemplateFromEs,
} from '@kbn/index-management-plugin/common/types';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

function isReservedSystemTemplate(templateName: string, indexPatterns: string[]): boolean {
  return (
    templateName.startsWith('kibana_index_template') ||
    (templateName.startsWith('.') &&
      indexPatterns.every((pattern) => {
        return !pattern.includes('*');
      }))
  );
}

function filterLegacyTemplates(templates: {
  [templateName: string]: LegacyTemplateSerialized;
}): Array<{ name: string; settings?: IndexSettings }> {
  const formattedTemplates = [];
  const templateNames = Object.keys(templates);
  for (const templateName of templateNames) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { settings, index_patterns } = templates[templateName];
    if (isReservedSystemTemplate(templateName, index_patterns)) {
      continue;
    }
    const formattedTemplate = {
      settings,
      name: templateName,
    };
    formattedTemplates.push(formattedTemplate);
  }
  return formattedTemplates;
}

function filterTemplates(
  templates:
    | { index_templates: TemplateFromEs[] }
    | { [templateName: string]: LegacyTemplateSerialized },
  isLegacy: boolean
): Array<{ name: string; settings?: IndexSettings }> {
  if (isLegacy) {
    return filterLegacyTemplates(templates as { [templateName: string]: LegacyTemplateSerialized });
  }
  const { index_templates: indexTemplates } = templates as { index_templates: TemplateFromEs[] };
  return indexTemplates.map((template: TemplateFromEs) => {
    return { name: template.name, settings: template.index_template.template?.settings };
  });
}

async function fetchTemplates(
  client: ElasticsearchClient,
  isLegacy: boolean
): Promise<
  { index_templates: TemplateFromEs[] } | { [templateName: string]: LegacyTemplateSerialized }
> {
  const options = {
    // we allow 404 incase the user shutdown security in-between the check and now
    ignore: [404],
  };

  const response = isLegacy
    ? await client.indices.getTemplate({}, options)
    : await client.indices.getIndexTemplate({}, options);
  // @ts-expect-error TemplateSerialized.index_patterns not compatible with IndicesIndexTemplate.index_patterns
  return response;
}

const querySchema = schema.object({
  legacy: schema.maybe(schema.oneOf([schema.literal('true'), schema.literal('false')])),
});

export function registerFetchRoute({ router, license, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    { path: addBasePath('/templates'), validate: { query: querySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const isLegacy = (request.query as TypeOf<typeof querySchema>).legacy === 'true';
      try {
        const templates = await fetchTemplates(
          context.core.elasticsearch.client.asCurrentUser,
          isLegacy
        );
        const okResponse = { body: filterTemplates(templates, isLegacy) };
        return response.ok(okResponse);
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
