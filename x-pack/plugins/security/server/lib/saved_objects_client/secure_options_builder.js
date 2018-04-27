/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

export function secureSavedObjectsClientOptionsBuilder(server, options) {
  const adminCluster = server.plugins.elasticsearch.getCluster('admin');
  const { callWithInternalUser } = adminCluster;

  const config = server.config();

  return {
    ...options,
    application: config.get('xpack.security.rbac.application'),
    kibanaVersion: config.get('pkg.version'),
    callCluster: callWithInternalUser
  };
}
