/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildPrivilegeMap } from '../../../lib/privileges/privileges';

export function initPrivilegesApi(server) {
  const config = server.config();
  const kibanaVersion = config.get('pkg.version');
  const application = config.get('xpack.security.rbac.application');
  const savedObjectTypes = server.savedObjects.types;

  server.route({
    method: 'GET',
    path: '/api/security/v1/privileges',
    handler(request, reply) {
      // we're returning our representation of the privileges, as opposed to the ones that are stored
      // in Elasticsearch because our current thinking is that we'll associate additional structure/metadata
      // with our view of them to allow users to more efficiently edit privileges for roles, and serialize it
      // into a different structure for enforcement within Elasticsearch
      const privileges = buildPrivilegeMap(savedObjectTypes, application, kibanaVersion);
      reply(Object.values(privileges));
    }
  });
}
