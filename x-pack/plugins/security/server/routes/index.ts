/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, IRouter, Logger } from '../../../../../src/core/server';
import { Authentication } from '../authentication';
import { ConfigType } from '../config';
import { defineAuthenticationRoutes } from './authentication';
import { LegacyAPI } from '../plugin';

/**
 * Describes parameters used to define HTTP routes.
 */
export interface RouteDefinitionParams {
  router: IRouter;
  basePath: CoreSetup['http']['basePath'];
  logger: Logger;
  config: ConfigType;
  authc: Authentication;
  getLegacyAPI: () => LegacyAPI;
}

export function defineRoutes(params: RouteDefinitionParams) {
  defineAuthenticationRoutes(params);
}
