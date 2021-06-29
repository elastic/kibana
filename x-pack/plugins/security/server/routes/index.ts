/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { HttpResources, IBasePath, Logger } from 'src/core/server';

import type { KibanaFeature } from '../../../features/server';
import type { SecurityLicense } from '../../common/licensing';
import type { InternalAuthenticationServiceStart } from '../authentication';
import type { AuthorizationServiceSetupInternal } from '../authorization';
import type { ConfigType } from '../config';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import type { Session } from '../session_management';
import type { SecurityRouter } from '../types';
import { defineApiKeysRoutes } from './api_keys';
import { defineAuthenticationRoutes } from './authentication';
import { defineAuthorizationRoutes } from './authorization';
import { defineIndicesRoutes } from './indices';
import { defineRoleMappingRoutes } from './role_mapping';
import { defineSessionManagementRoutes } from './session_management';
import { defineUsersRoutes } from './users';
import { defineViewRoutes } from './views';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  router: SecurityRouter;
  basePath: IBasePath;
  httpResources: HttpResources;
  logger: Logger;
  config: ConfigType;
  authz: AuthorizationServiceSetupInternal;
  getSession: () => PublicMethodsOf<Session>;
  license: SecurityLicense;
  getFeatures: () => Promise<KibanaFeature[]>;
  getFeatureUsageService: () => SecurityFeatureUsageServiceStart;
  getAuthenticationService: () => InternalAuthenticationServiceStart;
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
