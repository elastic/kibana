/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildPrivilegeMap } from '../../../lib/authorization';

export function initPrivilegesApi(server) {
  const { authorization } = server.plugins.security;
  const savedObjectTypes = server.savedObjects.types;

  server.route({
    method: 'GET',
    path: '/api/security/v1/privileges',
    handler(request, reply) {
      // we're returning our representation of the privileges, as opposed to the ones that are stored
      // in Elasticsearch because our current thinking is that we'll associate additional structure/metadata
      // with our view of them to allow users to more efficiently edit privileges for roles, and serialize it
      // into a different structure for enforcement within Elasticsearch
      const privileges = buildPrivilegeMap(savedObjectTypes, authorization.application, authorization.actions);
      reply(Object.values(privileges));
    }
  });
}
