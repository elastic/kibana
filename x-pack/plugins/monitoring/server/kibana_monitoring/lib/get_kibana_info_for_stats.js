/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const snapshotRegex = /-snapshot/i;

/**
 * This provides a common structure to apply to all Kibana monitoring documents so that they can be commonly
 * searched, field-collapsed, and aggregated against.
 *
 * @param {Object} kbnServer manager of Kibana services - see `src/legacy/server/kbn_server` in Kibana core
 * @param {Object} config Server config
 * @param {String} host Kibana host
 * @return {Object} The object containing a "kibana" field and source instance details.
 */
export function getKibanaInfoForStats({ uuid, name, index, host, port, version, status }) {
  return {
    uuid,
    name,
    index,
    host,
    transport_address: `${host}:${port}`,
    version,
    snapshot: snapshotRegex.test(version),
    status,
  };
}
