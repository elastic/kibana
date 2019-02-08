/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionsFactory } from './actions';
import { authorizationModeFactory } from './mode';
import { privilegesFactory } from './privileges';
import { checkPrivilegesWithRequestFactory } from './check_privileges';
import { checkPrivilegesDynamicallyWithRequestFactory } from './check_privileges_dynamically';
import { getClient } from '../../../../../server/lib/get_client_shield';

export function createAuthorizationService(server, xpackInfoFeature, xpackMainPlugin, spaces) {
  const shieldClient = getClient(server);
  const config = server.config();

  const actions = actionsFactory(config);
  const application = `kibana-${config.get('kibana.index')}`;
  const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(actions, application, shieldClient);
  const checkPrivilegesDynamicallyWithRequest = checkPrivilegesDynamicallyWithRequestFactory(checkPrivilegesWithRequest, spaces);
  const mode = authorizationModeFactory(
    xpackInfoFeature,
  );
  const privileges = privilegesFactory(actions, xpackMainPlugin);

  return {
    actions,
    application,
    checkPrivilegesWithRequest,
    checkPrivilegesDynamicallyWithRequest,
    mode,
    privileges,
  };
}
