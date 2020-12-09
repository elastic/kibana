/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { canRedirectRequest } from './can_redirect_request';
export {
  AuthenticationService,
  AuthenticationServiceSetup,
  AuthenticationServiceStart,
} from './authentication_service';
export { AuthenticationResult } from './authentication_result';
export { DeauthenticationResult } from './deauthentication_result';
export {
  OIDCLogin,
  SAMLLogin,
  BasicAuthenticationProvider,
  TokenAuthenticationProvider,
  SAMLAuthenticationProvider,
  OIDCAuthenticationProvider,
} from './providers';
export {
  BasicHTTPAuthorizationHeaderCredentials,
  HTTPAuthorizationHeader,
} from './http_authentication';
export type {
  CreateAPIKeyResult,
  InvalidateAPIKeyResult,
  CreateAPIKeyParams,
  InvalidateAPIKeyParams,
  GrantAPIKeyResult,
} from './api_keys';
