/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { isSecurityEnabled } from './feature_check';

export const createHandlers = (request, server) => {
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  const config = server.config();

  return {
    environment: 'server',
    serverUri:
      config.has('server.rewriteBasePath') && config.get('server.rewriteBasePath')
        ? `${server.info.uri}${config.get('server.basePath')}`
        : server.info.uri,
    httpHeaders: request.headers,
    elasticsearchClient: async (...args) => {
      // check if the session is valid because continuing to use it
      // TODO: replace this when we use the method exposed by security https://github.com/elastic/kibana/pull/24616
      if (isSecurityEnabled(server)) {
        const authenticationResult = await server.plugins.security.authenticate(request);
        if (!authenticationResult.succeeded()) throw boom.unauthorized(authenticationResult.error);
      }

      return callWithRequest(request, ...args);
    },
  };
};
