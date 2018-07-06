/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionsFactory } from './actions';
import { checkPrivilegesWithRequestFactory } from './check_privileges';
import { deepFreeze } from './deep_freeze';
import { getClient } from '../../../../../server/lib/get_client_shield';

export function initAuthorizationService(server) {
  const shieldClient = getClient(server);
  const config = server.config();

  const actions = actionsFactory(config);
  const application = `kibana-${config.get('kibana.index')}`;

  server.expose('authorization', deepFreeze({
    actions,
    application,
    checkPrivilegesWithRequest: checkPrivilegesWithRequestFactory(shieldClient, config, actions, application),
  }));
}
