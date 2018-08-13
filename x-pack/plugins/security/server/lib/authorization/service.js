/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionsFactory } from './actions';
import { CHECK_PRIVILEGES_RESULT, checkPrivilegesWithRequestFactory } from './check_privileges';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { RBAC_AUTH_SCOPE } from '../../../common/constants';

export function createAuthorizationService(server, xpackInfoFeature) {
  const shieldClient = getClient(server);
  const config = server.config();

  const actions = actionsFactory(config);
  const application = `kibana-${config.get('kibana.index')}`;
  const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(shieldClient, config, actions, application);

  return {
    actions,
    application,
    checkPrivilegesWithRequest,
    CHECK_PRIVILEGES_RESULT,
    isRbacEnabled() {
      return xpackInfoFeature.getLicenseCheckResults().allowRbac;
    },
    useRbacForRequest(request) {
      return request.auth.credentials && request.auth.credentials.scope && request.auth.credentials.scope.includes(RBAC_AUTH_SCOPE);
    }
  };
}
