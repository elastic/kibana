/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export {
  BaseAuthenticationProvider,
  AuthenticationProviderOptions,
  AuthenticationProviderSpecificOptions,
} from './base';
export { BasicAuthenticationProvider } from './basic';
export { KerberosAuthenticationProvider } from './kerberos';
export { SAMLAuthenticationProvider, isSAMLRequestQuery, SAMLLoginStep } from './saml';
export { TokenAuthenticationProvider } from './token';
export { OIDCAuthenticationProvider, OIDCAuthenticationFlow } from './oidc';
export { PKIAuthenticationProvider } from './pki';
