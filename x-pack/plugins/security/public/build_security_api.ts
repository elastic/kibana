/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreInternalSecurityContract } from '@kbn/core-security-browser';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';

export const buildSecurityApi = ({
  authc,
}: {
  authc: AuthenticationServiceSetup;
}): CoreInternalSecurityContract => {
  return {
    authc: {
      getCurrentUser: () => authc.getCurrentUser(),
    },
  };
};
