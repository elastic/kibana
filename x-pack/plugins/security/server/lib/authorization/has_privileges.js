/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getClient } from '../../../../../server/lib/get_client_shield';
import { DEFAULT_RESOURCE } from '../../../common/constants';

export function createRequestHasPrivileges(server) {
  const callWithRequest = getClient(server).callWithRequest;

  const config = server.config();
  const kibanaVersion = config.get('pkg.version');
  const application = config.get('xpack.security.rbac.application');

  return function requestHasPrivileges(request) {
    return async function hasPrivileges(privileges) {
      const version = `version:${kibanaVersion}`;

      const privilegeCheck = await callWithRequest(request, 'shield.hasPrivileges', {
        body: {
          applications: [{
            application,
            resources: [DEFAULT_RESOURCE],
            privileges: [version, ...privileges]
          }]
        }
      });

      const success = privilegeCheck.has_all_requested;
      return {
        success,
        message: success ? null : `User ${privilegeCheck.username} doesn't have all ${privileges.join()} privileges}`
      };
    };
  };
}
