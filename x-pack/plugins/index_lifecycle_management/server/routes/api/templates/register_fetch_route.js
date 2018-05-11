/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';

async function formatTemplates(templates, callWithRequest) {
  const formattedTemplates = [];
  const templateNames = Object.keys(templates);
  for (const templateName of templateNames) {
    const { settings, index_patterns } = templates[templateName]; // eslint-disable-line camelcase
    const formattedTemplate = {
      index_lifecycle_name: settings.index && settings.index.lifecycle ? settings.index.lifecycle.name : undefined,
      index_patterns,
      allocation_rules: settings.index && settings.index.routing ? settings.index.routing : undefined,
      name: templateName,
    };

    const { indices } = await fetchIndices(index_patterns, callWithRequest);
    formattedTemplate.indices = indices ? Object.keys(indices) : [];
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

async function fetchIndices(indexPatterns, callWithRequest) {
  const params = {
    method: 'GET',
    path: `/${indexPatterns}/_stats`,
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
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const hits = await fetchTemplates(callWithRequest);
        const templates = formatTemplates(hits, callWithRequest);
        reply(templates);
      } catch (err) {
        if (isEsError(err)) {
          return reply(wrapEsError(err));
        }

        reply(wrapUnknownError(err));
      }
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
