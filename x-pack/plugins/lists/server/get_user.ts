/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';

import { SecurityPluginSetup } from '../../security/server';

export interface GetUserOptions {
  security: SecurityPluginSetup | null | undefined;
  request: KibanaRequest;
}

export const getUser = ({ security, request }: GetUserOptions): string => {
  if (security != null) {
    const authenticatedUser = security.authc.getCurrentUser(request);
    if (authenticatedUser != null) {
      return authenticatedUser.username;
    } else {
      return 'elastic';
    }
  } else {
    return 'elastic';
  }
};
