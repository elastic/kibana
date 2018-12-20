/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';
import { any } from 'lodash';

function isReservedSystemTemplate(templateName, indexPattens) {
  return templateName.startsWith('kibana_index_template') ||
    (
      templateName.startsWith('.') &&
        !any(indexPattens, (pattern) => {
          return pattern.includes('*');
        })
    );
}
async function filterAndFormatTemplates(templates) {
  const formattedTemplates = [];
  const templateNames = Object.keys(templates);
  for (const templateName of templateNames) {
    const { settings, index_patterns } = templates[templateName]; // eslint-disable-line camelcase
    if (isReservedSystemTemplate(templateName, index_patterns)) {
      continue;
    }
    const formattedTemplate = {
      index_lifecycle_name: settings.index && settings.index.lifecycle ? settings.index.lifecycle.name : undefined,
      index_patterns,
      allocation_rules: settings.index && settings.index.routing ? settings.index.routing : undefined,
      settings,
      name: templateName,
    };
    formattedTemplates.push(formattedTemplate);
  }
  return formattedTemplates;
}

async function fetchTemplates(callWithRequest) {
  const params = {
    method: 'GET',
    path: '/_template',
    // we allow 404 incase the user shutdown security in-between the check and now
    ignore: [ 404 ]
  };

  return await callWithRequest('transport.request', params);
}
export function registerFetchRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_lifecycle_management/templates',
    method: 'GET',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const hits = await fetchTemplates(callWithRequest);
        const templates = await filterAndFormatTemplates(hits);
        return templates;
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
