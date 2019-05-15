/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

import { getClient } from '../../../../../server/lib/get_client_shield';
import { SpacesPlugin } from '../../../../spaces/types';
import { XPackFeature, XPackMainPlugin } from '../../../../xpack_main/xpack_main';
import { APPLICATION_PREFIX } from '../../../common/constants';
import { OptionalPlugin } from '../optional_plugin';
import { Actions, actionsFactory } from './actions';
import { CheckPrivilegesWithRequest, checkPrivilegesWithRequestFactory } from './check_privileges';
import {
  CheckPrivilegesDynamicallyWithRequest,
  checkPrivilegesDynamicallyWithRequestFactory,
} from './check_privileges_dynamically';
import { AuthorizationMode, authorizationModeFactory } from './mode';
import { privilegesFactory, PrivilegesService } from './privileges';

export interface AuthorizationService {
  actions: Actions;
  application: string;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  checkPrivilegesDynamicallyWithRequest: CheckPrivilegesDynamicallyWithRequest;
  mode: AuthorizationMode;
  privileges: PrivilegesService;
}

export function createAuthorizationService(
  server: Server,
  securityXPackFeature: XPackFeature,
  xpackMainPlugin: XPackMainPlugin,
  spaces: OptionalPlugin<SpacesPlugin>
): AuthorizationService {
  const shieldClient = getClient(server);
  const config = server.config();

  const actions = actionsFactory(config);
  const application = `${APPLICATION_PREFIX}${config.get('kibana.index')}`;
  const checkPrivilegesWithRequest = checkPrivilegesWithRequestFactory(
    actions,
    application,
    shieldClient
  );
  const checkPrivilegesDynamicallyWithRequest = checkPrivilegesDynamicallyWithRequestFactory(
    checkPrivilegesWithRequest,
    spaces
  );
  const mode = authorizationModeFactory(securityXPackFeature);
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
