/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature } from '../../../features/server';
import {
  CoreSetup,
  HttpResources,
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
import { defineViewRoutes } from './views';
import { SecurityFeatureUsageServiceStart } from '../feature_usage';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  router: IRouter;
  basePath: CoreSetup['http']['basePath'];
  httpResources: HttpResources;
  logger: Logger;
  clusterClient: ILegacyClusterClient;
  config: ConfigType;
  authc: Authentication;
  authz: AuthorizationServiceSetup;
  license: SecurityLicense;
  getFeatures: () => Promise<Feature[]>;
  getFeatureUsageService: () => SecurityFeatureUsageServiceStart;
}

export function defineRoutes(params: RouteDefinitionParams) {
  defineAuthenticationRoutes(params);
  defineAuthorizationRoutes(params);
  defineApiKeysRoutes(params);
  defineIndicesRoutes(params);
  defineUsersRoutes(params);
  defineRoleMappingRoutes(params);
  defineViewRoutes(params);
}
