/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';
import { schema, TypeOf } from '@kbn/config-schema';
import {
  IndexSettings,
  LegacyTemplateSerialized,
  TemplateFromEs,
} from '../../../../../index_management/common/types';
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
  callAsCurrentUser: LegacyAPICaller,
  isLegacy: boolean
): Promise<
  { index_templates: TemplateFromEs[] } | { [templateName: string]: LegacyTemplateSerialized }
> {
  const params = {
    method: 'GET',
    path: isLegacy ? '/_template' : '/_index_template',
    // we allow 404 incase the user shutdown security in-between the check and now
    ignore: [404],
  };

  return await callAsCurrentUser('transport.request', params);
}

const querySchema = schema.object({
  legacy: schema.maybe(schema.oneOf([schema.literal('true'), schema.literal('false')])),
});

export function registerFetchRoute({ router, license, lib }: RouteDependencies) {
  router.get(
    { path: addBasePath('/templates'), validate: { query: querySchema } },
    license.guardApiRoute(async (context, request, response) => {
      const isLegacy = (request.query as TypeOf<typeof querySchema>).legacy === 'true';
      try {
        const templates = await fetchTemplates(
          context.core.elasticsearch.legacy.client.callAsCurrentUser,
          isLegacy
        );
        const okResponse = { body: filterTemplates(templates, isLegacy) };
        return response.ok(okResponse);
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
