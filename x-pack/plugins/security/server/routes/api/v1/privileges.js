/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*! Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more contributor license agreements.
 * Licensed under the Elastic License; you may not use this file except in compliance with the Elastic License. */

import { getClient } from '../../../../../../server/lib/get_client_shield';
import { buildPrivilegeMap } from '../../../lib/privileges/privileges';

export function initPrivilegesApi(server) {
  const callWithInternalUser = getClient(server).callWithInternalUser; // eslint-disable-line no-unused-vars

  const config = server.config();
  const kibanaVersion = config.get('pkg.version');
  const application = config.get('xpack.security.rbac.application');

  server.route({
    method: 'GET',
    path: '/api/security/v1/privileges',
    handler(request, reply) {
      const privileges = buildPrivilegeMap(application, kibanaVersion);
      reply(Object.values(privileges));
    }
  });
}
