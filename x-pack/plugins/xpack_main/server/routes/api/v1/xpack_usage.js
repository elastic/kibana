/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrap, serverTimeout as serverUnavailable } from 'boom';

const getClusterUuid = async req => {
  const { server } = req;
  const { callWithRequest, } = server.plugins.elasticsearch.getCluster('data');
  const { cluster_uuid: uuid } = await callWithRequest(req, 'info', { filterPath: 'cluster_uuid', });
  return uuid;
};

/*
 * @return {Object} data from usage stats collectors registered with Monitoring CollectorSet
 * @throws {Error} if the Monitoring CollectorSet is not ready
 */
const getUsage = async req => {
  const server = req.server;
  const { collectorSet } = server.plugins.monitoring;
  if (collectorSet === undefined) {
    const error = new Error('CollectorSet from Monitoring plugin is not ready for collecting usage'); // moving kibana_monitoring lib to xpack_main will make this unnecessary
    throw serverUnavailable(error);
  }
  return collectorSet.bulkFetchUsage();
};

export function xpackUsageRoute(server) {
  server.route({
    path: '/api/_xpack/usage',
    method: 'GET',
    async handler(req, reply) {
      try {
        const [ clusterUuid, xpackUsage ] = await Promise.all([
          getClusterUuid(req),
          getUsage(req),
        ]);

        reply({
          cluster_uuid: clusterUuid,
          ...xpackUsage
        });
      } catch(err) {
        req.log(['error'], err);
        if (err.isBoom) {
          reply(err);
        } else {
          reply(wrap(err, err.statusCode, err.message));
        }
      }
    }
  });
}
