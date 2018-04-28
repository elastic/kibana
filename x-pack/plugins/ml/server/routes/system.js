/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { callWithRequestFactory } from '../client/call_with_request_factory';
import { callWithInternalUserFactory } from '../client/call_with_internal_user_factory';

import { wrapError } from '../client/errors';
import Boom from 'boom';

export function systemRoutes(server, commonRouteConfig) {
  const callWithInternalUser = callWithInternalUserFactory(server);

  function isSecurityDisabled() {
    const xpackMainPlugin = server.plugins.xpack_main;
    const xpackInfo = xpackMainPlugin && xpackMainPlugin.info;
    const securityInfo = xpackInfo && xpackInfo.isAvailable() && xpackInfo.feature('security');

    return (securityInfo && securityInfo.isEnabled() === false);
  }

  function getNodeCount() {
    const filterPath = 'nodes.*.attributes';
    return callWithInternalUser('nodes.info', { filterPath })
      .then((resp) => {
        let count = 0;
        if (typeof resp.nodes === 'object') {
          Object.keys(resp.nodes).forEach((k) => {
            if (resp.nodes[k].attributes !== undefined) {
              if (resp.nodes[k].attributes['ml.enabled'] === 'true') {
                count++;
              }
            }
          });
        }
        return { count };
      });
  }

  server.route({
    method: 'POST',
    path: '/api/ml/_has_privileges',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      if (isSecurityDisabled()) {
        // if xpack.security.enabled has been explicitly set to false
        // return that security is disabled and don't call the privilegeCheck endpoint
        reply({ securityDisabled: true });
      } else {
        const body = request.payload;
        return callWithRequest('ml.privilegeCheck', { body })
          .then(resp => reply(resp))
          .catch(resp => reply(wrapError(resp)));
      }
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/ml_node_count',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      return new Promise((resolve, reject) => {
        if (isSecurityDisabled()) {
          getNodeCount()
            .then(resolve)
            .catch(reject);
        } else {
          // if security is enabled, check that the user has permission to
          // view jobs before calling getNodeCount.
          // getNodeCount calls the _nodes endpoint as the internal user
          // and so could give the user access to more information than
          // they are entitled to.
          const body = {
            cluster: [
              'cluster:monitor/xpack/ml/job/get',
              'cluster:monitor/xpack/ml/job/stats/get',
              'cluster:monitor/xpack/ml/datafeeds/get',
              'cluster:monitor/xpack/ml/datafeeds/stats/get'
            ]
          };
          callWithRequest('ml.privilegeCheck', { body })
            .then((resp) => {
              if (resp.cluster['cluster:monitor/xpack/ml/job/get'] &&
                resp.cluster['cluster:monitor/xpack/ml/job/stats/get'] &&
                resp.cluster['cluster:monitor/xpack/ml/datafeeds/get'] &&
                resp.cluster['cluster:monitor/xpack/ml/datafeeds/stats/get']) {
                getNodeCount()
                  .then(resolve)
                  .catch(reject);
              } else {
                // if the user doesn't have permission to create jobs
                // return a 403
                reject(Boom.forbidden());
              }
            })
            .catch(reject);
        }
      })
        .then(resp => reply(resp))
        .catch(error => reply(wrapError(error)));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/info',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      return callWithRequest('ml.info')
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });
}
