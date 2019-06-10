/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { AuthenticatedUser } from './common/model';
import { AuthenticationResult, DeauthenticationResult } from './server/lib/authentication';
import { AuthorizationService } from './server/lib/authorization/service';

/**
 * Public interface of the security plugin.
 */
export interface SecurityPlugin {
  authorization: Readonly<AuthorizationService>;
  authenticate: (request: Legacy.Request) => Promise<AuthenticationResult>;
  deauthenticate: (request: Legacy.Request) => Promise<DeauthenticationResult>;
  getUser: (request: Legacy.Request) => Promise<AuthenticatedUser>;
  isAuthenticated: (request: Legacy.Request) => Promise<boolean>;
}
