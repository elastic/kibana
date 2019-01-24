/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';

async function fetchTemplates(callWithRequest) {
  const params = {
    method: 'GET',
    path: '/_template',
    // we allow 404 in case there are no templates
    ignore: [404]
  };

  return await callWithRequest('transport.request', params);
}

async function getAffectedIndices(
  callWithRequest,
  indexTemplateName,
  policyName
) {
  const templates = await fetchTemplates(callWithRequest);

  if (!templates || Object.keys(templates).length === 0 || templates.status === 404) {
    return [];
  }

  const indexPatterns = Object.entries(templates).reduce((accum, [templateName, template]) => {
    const isMatchingTemplate = templateName === indexTemplateName;
    const isMatchingPolicy = (
      policyName &&
      template.settings &&
      template.settings.index &&
      template.settings.index.lifecycle &&
      template.settings.index.lifecycle.name === policyName
    );
    if (isMatchingTemplate || isMatchingPolicy) {
      accum.push(...template.index_patterns);
    }
    return accum;
  }, []);

  if (indexPatterns.length === 0) {
    return [];
  }
  const indexParams = {
    method: 'GET',
    path: `/${encodeURIComponent(indexPatterns.join(','))}`,
    // we allow 404 in case there are no indices
    ignore: [404]
  };
  const indices = await callWithRequest('transport.request', indexParams);

  if (!indices || indices.status === 404) {
    return [];
  }

  return Object.keys(indices);
}

export function registerGetAffectedRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path:
      '/api/index_lifecycle_management/indices/affected/{indexTemplateName}',
    method: 'GET',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const response = await getAffectedIndices(
          callWithRequest,
          request.params.indexTemplateName,
        );
        return response;
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
    config: {
      pre: [licensePreRouting]
    }
  });

  server.route({
    path:
      '/api/index_lifecycle_management/indices/affected/{indexTemplateName}/{policyName}',
    method: 'GET',
    handler: async (request) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const response = await getAffectedIndices(
          callWithRequest,
          request.params.indexTemplateName,
          request.params.policyName
        );
        return response;
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
    config: {
      pre: [licensePreRouting]
    }
  });
}
