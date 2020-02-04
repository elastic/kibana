/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'kibana/server';
import { Authentication } from '../../../../../security/server';

interface WithCurrentUsernameArgs<D> {
  authc: Authentication;
  handlerFactory: (deps: D & { username: string }) => any;
  passThroughDeps: Partial<D>;
}

export const withCurrentUsername = <D = { [key: string]: any }>({
  authc,
  handlerFactory,
  passThroughDeps,
}: WithCurrentUsernameArgs<D>): RequestHandler => async (ctx, request, response) => {
  const username = await authc.getCurrentUser(request);
  if (!username) {
    return response.forbidden({ body: 'Could not find current username' });
  }
  const handler = handlerFactory({ username: username.username, ...passThroughDeps } as D & {
    username: string;
  });

  return handler(ctx, request, response);
};
