/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../../lib/error_wrappers';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';
import { merge } from 'lodash';

async function createLifecycle(callWithRequest, lifecycle) {
  const body = {
    policy: {
      phases: lifecycle.phases,
    }
  };
  const params = {
    method: 'PUT',
    path: `/_xpack/index_lifecycle/${lifecycle.name}`,
    ignore: [ 404 ],
    body,
  };

  return await callWithRequest('transport.request', params);
}

async function getIndexTemplate(callWithRequest, indexTemplate) {
  const response = await callWithRequest('indices.getTemplate', { name: indexTemplate });
  return response[indexTemplate];
}

async function updateIndexTemplate(callWithRequest, indexTemplatePatch) {
  // Fetch existing template
  const template = await getIndexTemplate(callWithRequest, indexTemplatePatch.indexTemplate);
  merge(template, {
    settings: {
      index: {
        number_of_shards: indexTemplatePatch.primaryShardCount,
        number_of_replicas: indexTemplatePatch.replicaCount,
        lifecycle: {
          name: indexTemplatePatch.lifecycleName,
        },
        routing: {
          allocation: {
            include: {
              sattr_name: indexTemplatePatch.nodeAttrs,
            }
          }
        }
      }
    }
  });

  const params = {
    method: 'PUT',
    path: `/_template/${indexTemplatePatch.indexTemplate}`,
    ignore: [ 404 ],
    body: template,
  };

  return await callWithRequest('transport.request', params);
}

export function registerCreateRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_lifecycle_management/lifecycle',
    method: 'POST',
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const response = await createLifecycle(callWithRequest, request.payload.lifecycle);
        const response2 = await updateIndexTemplate(callWithRequest, request.payload.indexTemplatePatch);
        reply([response, response2]);
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
