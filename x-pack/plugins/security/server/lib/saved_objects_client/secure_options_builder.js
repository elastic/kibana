/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

export function secureSavedObjectsClientOptionsBuilder(server, hasPrivilegesWithRequest, options) {
  const adminCluster = server.plugins.elasticsearch.getCluster('admin');
  const { callWithInternalUser } = adminCluster;
  const auditLogger = server.plugins.security.auditLogger;

  return {
    ...options,
    callCluster: callWithInternalUser,
    hasPrivilegesWithRequest,
    auditLogger
  };
}
