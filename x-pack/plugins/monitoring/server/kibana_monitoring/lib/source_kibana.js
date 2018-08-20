/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

const snapshotRegex = /-snapshot/i;

/**
 * This provides a common structure to apply to all Kibana monitoring documents so that they can be commonly
 * searched, field-collapsed, and aggregated against.
 *
 * 'sourceKibana' is akin to the `source_node` details in Elasticsearch nodes.
 *
 * @param {Object} kbnServer manager of Kibana services - see `src/server/kbn_server` in Kibana core
 * @param {Object} config Server config
 * @param {String} host Kibana host
 * @return {Object} The object containing a "kibana" field and source instance details.
 */
export function sourceKibana(kbnServer, config, host) {
  const status = kbnServer.status.toJSON();

  return {
    uuid: config.get('server.uuid'),
    name: config.get('server.name'),
    index: config.get('kibana.index'),
    host,
    transport_address: `${config.get('server.host')}:${config.get('server.port')}`,
    version: kbnServer.version.replace(snapshotRegex, ''),
    snapshot: snapshotRegex.test(kbnServer.version),
    status: get(status, 'overall.state')
  };
}
