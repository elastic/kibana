/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { INDEX_NAMES, TYPE_NAMES } from '../../../../common/constants';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';
import { Pipeline } from '../../../models/pipeline';
import { licensePreRoutingFactory } from'../../../lib/license_pre_routing_factory';

function fetchPipeline(callWithRequest, pipelineId) {
  return callWithRequest('get', {
    index: INDEX_NAMES.PIPELINES,
    type: TYPE_NAMES.PIPELINES,
    id: pipelineId,
    _source: [
      'description',
      'username',
      'pipeline',
      'pipeline_settings'
    ],
    ignore: [ 404 ]
  });
}

export function registerLoadRoute(server) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/logstash/pipeline/{id}',
    method: 'GET',
    handler: (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);
      const pipelineId = request.params.id;

      return fetchPipeline(callWithRequest, pipelineId)
        .then((pipelineResponseFromES) => {
          if (!pipelineResponseFromES.found) {
            return reply(Boom.notFound());
          }

          const pipeline = Pipeline.fromUpstreamJSON(pipelineResponseFromES);
          reply(pipeline.downstreamJSON);
        })
        .catch((e) => reply(Boom.internal(e)));
    },
    config: {
      pre: [ licensePreRouting ]
    }
  });
}
