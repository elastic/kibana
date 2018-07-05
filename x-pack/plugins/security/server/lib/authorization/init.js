/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionsFactory } from './actions';
import { checkPrivilegesWithRequestFactory } from './check_privileges';
import { getClient } from '../../../../../server/lib/get_client_shield';

export function initAuthorization(server) {
  const shieldClient = getClient(server);
  const config = server.config();

  const actions = actionsFactory(config);

  server.expose('authorization', {
    checkPrivilegesWithRequest: checkPrivilegesWithRequestFactory(shieldClient, config, actions),
    actions
  });
}
