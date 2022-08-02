/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { SecurityPluginStart } from '@kbn/security-plugin/server';

export interface GetUserOptions {
  security: SecurityPluginStart | null | undefined;
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
