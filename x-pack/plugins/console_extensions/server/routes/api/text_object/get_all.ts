/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandler } from 'kibana/server';
import { APP } from '../../../../common/constants';
import { RouteDependencies, AuthcHandlerArgs } from './types';
import { TEXT_OBJECT } from './constants';
import { withCurrentUsername } from './with_current_username';

export const createHandler = ({
  getInternalSavedObjectsClient,
  username,
}: AuthcHandlerArgs): RequestHandler => async (ctx, request, response) => {
  const client = getInternalSavedObjectsClient();
  const result = await client.find({
    type: TEXT_OBJECT.type,
    search: username,
    searchFields: ['userId'],
  });

  return response.ok({
    body: result.saved_objects.map(({ id, attributes: { userId, ...restOfAttributes } }) => ({
      id,
      ...restOfAttributes,
    })),
  });
};

export const registerGetAllRoute = ({
  router,
  authc,
  getInternalSavedObjectsClient,
}: RouteDependencies) => {
  router.get(
    { path: `${APP.apiPathBase}/text_objects/get_all`, validate: false },
    withCurrentUsername<AuthcHandlerArgs>({
      authc,
      passThroughDeps: { getInternalSavedObjectsClient },
      handlerFactory: createHandler,
    })
  );
};
