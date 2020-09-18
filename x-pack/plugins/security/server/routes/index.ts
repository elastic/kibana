/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFeature } from '../../../features/server';
import {
  HttpResources,
  IBasePath,
  ILegacyClusterClient,
  IRouter,
  Logger,
} from '../../../../../src/core/server';
import { SecurityLicense } from '../../common/licensing';
import { Authentication } from '../authentication';
import { AuthorizationServiceSetup } from '../authorization';
import { ConfigType } from '../config';

import { defineAuthenticationRoutes } from './authentication';
import { defineAuthorizationRoutes } from './authorization';
import { defineApiKeysRoutes } from './api_keys';
import { defineIndicesRoutes } from './indices';
import { defineUsersRoutes } from './users';
import { defineRoleMappingRoutes } from './role_mapping';
import { defineSessionManagementRoutes } from './session_management';
import { defineViewRoutes } from './views';
import { SecurityFeatureUsageServiceStart } from '../feature_usage';
import { Session } from '../session_management';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  router: IRouter;
  basePath: IBasePath;
  httpResources: HttpResources;
  logger: Logger;
  clusterClient: ILegacyClusterClient;
  config: ConfigType;
  authc: Authentication;
  authz: AuthorizationServiceSetup;
  session: PublicMethodsOf<Session>;
  license: SecurityLicense;
  getFeatures: () => Promise<KibanaFeature[]>;
  getFeatureUsageService: () => SecurityFeatureUsageServiceStart;
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
