/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { SECURITY_AUTH_MESSAGE } from '../../common/lib/constants';
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
      if (isSecurityEnabled(server)) {
        try {
          const authenticationResult = await server.plugins.security.authenticate(request);
          if (!authenticationResult.succeeded())
            throw boom.unauthorized(authenticationResult.error);
        } catch (e) {
          // if authenticate throws, show error in development
          if (process.env.NODE_ENV !== 'production') {
            e.message = `elasticsearchClient failed: ${e.message}`;
            console.error(e);
          }

          // hide all failure information from the user
          throw boom.unauthorized(SECURITY_AUTH_MESSAGE);
        }
      }

      return callWithRequest(request, ...args);
    },
  };
};
