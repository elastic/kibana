/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'kibana/server';
import { Authentication } from '../../../../../security/server';

interface WithCurrentUsernameArgs<P = Record<string, any>> {
  authc: Authentication;
  userHandler: (deps: P & { username: string }) => RequestHandler;
  passThroughDeps: P;
}

export const withCurrentUsername = ({
  authc,
  userHandler,
  passThroughDeps,
}: WithCurrentUsernameArgs): RequestHandler => async (ctx, request, response) => {
  const username = await authc.getCurrentUser(request);
  if (!username) {
    return response.forbidden({ body: 'Could not find current username' });
  }
  return userHandler({ username, ...passThroughDeps })(ctx, request, response);
};
