/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// These exports are part of public Security plugin contract, any change in signature of exported
// functions or removal of exports should be considered as a breaking change.
export { wrapError } from './errors';
export {
  canRedirectRequest,
  AuthenticationResult,
  BasicCredentials,
  DeauthenticationResult,
} from './authentication';
