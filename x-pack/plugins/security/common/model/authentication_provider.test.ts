/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shouldProviderUseLoginForm } from './authentication_provider';

describe('#shouldProviderUseLoginForm', () => {
  ['basic', 'token'].forEach((providerType) => {
    it(`returns "true" for "${providerType}" provider`, () => {
      expect(shouldProviderUseLoginForm(providerType)).toEqual(true);
    });
  });

  ['anonymous', 'http', 'kerberos', 'oidc', 'pki', 'saml'].forEach((providerType) => {
    it(`returns "false" for "${providerType}" provider`, () => {
      expect(shouldProviderUseLoginForm(providerType)).toEqual(false);
    });
  });
});
