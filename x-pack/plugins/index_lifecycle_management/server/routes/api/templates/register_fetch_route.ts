/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'src/core/server';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../../../services';

/**
 * We don't want to output system template (whose name starts with a ".") which don't
 * have a time base index pattern (with a wildcard in it) as those templates are already
 * assigned to a single index.
 *
 * @param {String} templateName The index template
 * @param {Array} indexPatterns Index patterns
 */
function isReservedSystemTemplate(templateName: string, indexPatterns: string[]): boolean {
  return (
    templateName.startsWith('kibana_index_template') ||
    (templateName.startsWith('.') &&
      indexPatterns.every((pattern) => {
        return !pattern.includes('*');
      }))
  );
}

function filterAndFormatTemplates(templates: any): any {
  const formattedTemplates = [];
  const templateNames = Object.keys(templates);
  for (const templateName of templateNames) {
    const { settings, index_patterns } = templates[templateName]; // eslint-disable-line camelcase
    if (isReservedSystemTemplate(templateName, index_patterns)) {
      continue;
    }
    const formattedTemplate = {
      index_lifecycle_name:
        settings.index && settings.index.lifecycle ? settings.index.lifecycle.name : undefined,
      index_patterns,
      allocation_rules:
        settings.index && settings.index.routing ? settings.index.routing : undefined,
      settings,
      name: templateName,
    };
    formattedTemplates.push(formattedTemplate);
  }
  return formattedTemplates;
}

async function fetchTemplates(callAsCurrentUser: LegacyAPICaller): Promise<any> {
  const params = {
    method: 'GET',
    path: '/_template',
    // we allow 404 incase the user shutdown security in-between the check and now
    ignore: [404],
  };

  return await callAsCurrentUser('transport.request', params);
}

export function registerFetchRoute({ router, license, lib }: RouteDependencies) {
  router.get(
    { path: addBasePath('/templates'), validate: false },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const templates = await fetchTemplates(
          context.core.elasticsearch.legacy.client.callAsCurrentUser
        );
        const okResponse = { body: filterAndFormatTemplates(templates) };
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
