/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * LEGACY: we need to handle legacy data with some workaround values
 * If node information can't be retrieved, we call this function
 * that provides some usable defaults
 */
export function getDefaultNodeFromId(nodeId) {
  return {
    id: nodeId,
    name: nodeId,
    transport_address: '',
    master: false,
    type: 'node',
    attributes: {},
  };
}
