/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler } from 'kibana/server';
import { APP } from '../../../../common/constants';
import { TEXT_OBJECT } from './constants';
import { RouteDependencies, HandlerDependencies } from './types';
import { withCurrentUsername } from './with_current_username';
import { textObjectSchema, TextObjectSchema } from './text_object';

export const createHandlerFactory = ({ getInternalSavedObjectsClient }: HandlerDependencies) => (
  username: string
): RequestHandler<unknown, unknown, TextObjectSchema> => async (ctx, request, response) => {
  const client = getInternalSavedObjectsClient();
  const {
    attributes: { userId, ...restOfAttributes },
    id,
  } = await client.create(TEXT_OBJECT.type, {
    userId: username,
    ...request.body,
  });
  return response.ok({ body: { id, ...restOfAttributes } });
};

export const registerCreateRoute = ({
  router,
  authc,
  getInternalSavedObjectsClient,
}: RouteDependencies) => {
  router.post(
    { path: `${APP.apiPathBase}/text_objects/create`, validate: { body: textObjectSchema } },
    withCurrentUsername({
      authc,
      handlerFactory: createHandlerFactory({ getInternalSavedObjectsClient }),
    })
  );
};
