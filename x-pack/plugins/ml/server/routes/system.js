/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { callWithRequestFactory } from '../client/call_with_request_factory';
import { callWithInternalUserFactory } from '../client/call_with_internal_user_factory';
import { mlLog } from '../client/log';

import { wrapError } from '../client/errors';
import Boom from 'boom';

import { isSecurityDisabled } from '../lib/security_utils';

export function systemRoutes(server, commonRouteConfig) {
  const callWithInternalUser = callWithInternalUserFactory(server);

  function getNodeCount() {
    const filterPath = 'nodes.*.attributes';
    return callWithInternalUser('nodes.info', { filterPath })
      .then((resp) => {
        let count = 0;
        if (typeof resp.nodes === 'object') {
          Object.keys(resp.nodes).forEach((k) => {
            if (resp.nodes[k].attributes !== undefined) {
              const maxOpenJobs = resp.nodes[k].attributes['ml.max_open_jobs'];
              if (maxOpenJobs !== null && maxOpenJobs > 0) {
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
    async handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      try {
        let upgradeInProgress = false;
        try {
          const info = await callWithRequest('ml.info');
          // if ml indices are currently being migrated, upgrade_mode will be set to true
          // pass this back with the privileges to allow for the disabling of UI controls.
          upgradeInProgress = (info.upgrade_mode === true);
        } catch (error) {
          // if the ml.info check fails, it could be due to the user having insufficient privileges
          // most likely they do not have the ml_user role and therefore will be blocked from using
          // ML at all. However, we need to catch this error so the privilege check doesn't fail.
          if (error.status === 403) {
            mlLog('info', 'Unable to determine whether upgrade is being performed due to insufficient user privileges');
          } else {
            mlLog('warning', 'Unable to determine whether upgrade is being performed');
          }
        }

        if (isSecurityDisabled(server)) {
          // if xpack.security.enabled has been explicitly set to false
          // return that security is disabled and don't call the privilegeCheck endpoint
          return {
            securityDisabled: true,
            upgradeInProgress
          };
        } else {
          const body = request.payload;
          const resp = await callWithRequest('ml.privilegeCheck', { body });
          resp.upgradeInProgress = upgradeInProgress;
          return resp;
        }
      } catch (error) {
        return wrapError(error);
      }
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/ml_node_count',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      return new Promise((resolve, reject) => {
        // check for basic license first for consistency with other
        // security disabled checks
        if (isSecurityDisabled(server)) {
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
        .catch(error => wrapError(error));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'GET',
    path: '/api/ml/info',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      return callWithRequest('ml.info')
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  server.route({
    method: 'POST',
    path: '/api/ml/es_search',
    handler(request) {
      const callWithRequest = callWithRequestFactory(server, request);
      return callWithRequest('search', request.payload)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });
}
