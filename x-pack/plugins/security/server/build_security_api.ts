/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSecurityContract } from '@kbn/core-security-server';

import type { InternalAuthenticationServiceStart } from './authentication';

export const buildSecurityApi = ({
  getAuthc,
}: {
  getAuthc: () => InternalAuthenticationServiceStart;
}): CoreSecurityContract => {
  return {
    authc: {
      getCurrentUser: (request) => {
        return getAuthc().getCurrentUser(request);
      },
    },
  };
};
