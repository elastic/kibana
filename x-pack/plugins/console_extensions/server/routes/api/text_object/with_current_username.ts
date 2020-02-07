/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'kibana/server';
import { Authentication } from '../../../../../security/server';

interface WithCurrentUsernameArgs {
  /**
   * Security provided {@link Authentication} for securely determining user information.
   */
  authc: Authentication;

  /**
   * Handler factory: a function that we can call to return a {@link RequestHandler}.
   *
   * This wrapper will inject authenticated user information to the handler.
   *
   * @remark
   * Ideally we want to have a type like <P, Q, B>(username: string) => RequestHandler<P, Q, B>.
   *
   * However, when assigning with body like in `create.ts` TS complains that B
   * not assignable to `ReadOnly<{...}>`.
   */
  handlerFactory: (username: string) => any;
}

export const withCurrentUsername = ({
  authc,
  handlerFactory,
}: WithCurrentUsernameArgs): RequestHandler => async (ctx, request, response) => {
  const authenticatedUser = await authc.getCurrentUser(request);
  if (!authenticatedUser) {
    return response.forbidden({ body: 'Could not find current username' });
  }
  const handler = handlerFactory(authenticatedUser.username);
  return handler(ctx, request, response);
};
