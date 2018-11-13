/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionsFactory } from './actions';
import { authorizationModeFactory } from './mode';
import { checkPrivilegesWithRequestFactory } from './check_privileges';
import { getClient } from '../../../../../server/lib/get_client_shield';

export function createAuthorizationService(server, xpackInfoFeature) {
  const shieldClient = getClient(server);
  const config = server.config();

  const actions = actionsFactory(config);
  const application = `kibana-${config.get('kibana.index')}`;
  const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(actions, application, shieldClient);
  const mode = authorizationModeFactory(
    application,
    config,
    (...args) => server.log(...args),
    shieldClient,
    xpackInfoFeature,
  );

  return {
    actions,
    application,
    checkPrivilegesWithRequest,
    mode,
  };
}
