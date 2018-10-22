/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { licensePreRoutingFactory } from '../../../lib/license_pre_routing_factory';
import { callWithRequestFactory } from '../../../lib/call_with_request_factory';

async function fetchRemoteClusters(callWithRequest) {
  const options = {
    method: 'GET',
    path: '_remote/info'
  };

  const remoteInfo = await callWithRequest('transport.request', options);
  return Object.keys(remoteInfo);
}

export function registerClustersRoute(server) {
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_management/clusters',
    method: 'GET',
    handler: async (request, reply) => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const response = await fetchRemoteClusters(callWithRequest);
        reply(response);
      } catch (error) {
        reply(error.body);
      }
    },
    config: {
      pre: [licensePreRouting]
    }
  });
}

