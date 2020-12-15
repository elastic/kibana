/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { KibanaFeature } from '../../../features/server';
import type { HttpResources, IBasePath, IRouter, Logger } from '../../../../../src/core/server';
import type { SecurityLicense } from '../../common/licensing';
import type { AuthenticationServiceStart } from '../authentication';
import type { AuthorizationServiceSetup } from '../authorization';
import type { ConfigType } from '../config';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import type { Session } from '../session_management';

import { defineAuthenticationRoutes } from './authentication';
import { defineAuthorizationRoutes } from './authorization';
import { defineApiKeysRoutes } from './api_keys';
import { defineIndicesRoutes } from './indices';
import { defineUsersRoutes } from './users';
import { defineRoleMappingRoutes } from './role_mapping';
import { defineSessionManagementRoutes } from './session_management';
import { defineViewRoutes } from './views';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  router: IRouter;
  basePath: IBasePath;
  httpResources: HttpResources;
  logger: Logger;
  config: ConfigType;
  authz: AuthorizationServiceSetup;
  session: PublicMethodsOf<Session>;
  license: SecurityLicense;
  getFeatures: () => Promise<KibanaFeature[]>;
  getFeatureUsageService: () => SecurityFeatureUsageServiceStart;
  getAuthenticationService: () => AuthenticationServiceStart;
}

export function defineRoutes(params: RouteDefinitionParams) {
  defineAuthenticationRoutes(params);
  defineAuthorizationRoutes(params);
  defineSessionManagementRoutes(params);
  defineApiKeysRoutes(params);
  defineIndicesRoutes(params);
  defineUsersRoutes(params);
  defineRoleMappingRoutes(params);
  defineViewRoutes(params);
}
