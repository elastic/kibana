/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actionsFactory } from './actions';
import { ALL_RESOURCE } from '../../../common/constants';
import { AuthorizationMode } from './mode';
import { CHECK_PRIVILEGES_RESULT, checkPrivilegesWithRequestFactory } from './check_privileges';
import { checkPrivilegesAtAllResourcesWithRequestFactory } from './check_privileges_at_all_resources';
import { getClient } from '../../../../../server/lib/get_client_shield';
import { spaceApplicationPrivilegesSerializer } from './space_application_privileges_serializer';

export function createAuthorizationService(server, xpackInfoFeature) {
  const shieldClient = getClient(server);
  const config = server.config();

  const actions = actionsFactory(config);
  const application = `kibana-${config.get('kibana.index')}`;
  const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(shieldClient, config, actions, application);
  const checkPrivilegesAtAllResourcesWithRequest = checkPrivilegesAtAllResourcesWithRequestFactory(
    checkPrivilegesWithRequest,
    server.plugins.elasticsearch,
    server.savedObjects,
    server.plugins.spaces,
  );
  const mode = new AuthorizationMode(actions, checkPrivilegesAtAllResourcesWithRequest, xpackInfoFeature);

  return {
    actions,
    application,
    checkPrivilegesWithRequest,
    CHECK_PRIVILEGES_RESULT,
    mode,
    resources: {
      all: ALL_RESOURCE,
      getSpaceResource(spaceId) {
        return spaceApplicationPrivilegesSerializer.resource.serialize(spaceId);
      }
    }
  };
}
