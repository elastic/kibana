/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';

import { SecurityPluginSetup } from '../../../security/server';

interface GetUserOptions {
  security: SecurityPluginSetup;
  request: KibanaRequest;
}

export const getUser = ({ security, request }: GetUserOptions): string => {
  const authenticatedUser = security.authc.getCurrentUser(request);
  if (authenticatedUser != null) {
    return authenticatedUser.username;
  } else {
    return 'elastic';
  }
};
