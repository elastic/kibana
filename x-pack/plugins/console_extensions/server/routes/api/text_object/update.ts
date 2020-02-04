/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { RequestHandler } from 'kibana/server';
import { APP } from '../../../../common/constants';
import { TEXT_OBJECT } from './constants';
import { RouteDependencies, AuthcHandlerArgs } from './types';
import { withCurrentUsername } from './with_current_username';

const routeValidation = {
  body: schema.object({
    id: schema.string(),
    updatedAt: schema.number(),
    text: schema.string(),
  }),
};

type UpdateRouteValidationBody = TypeOf<typeof routeValidation.body>;

export const createHandler = ({
  getInternalSavedObjectsClient,
  username,
}: AuthcHandlerArgs): RequestHandler<unknown, unknown, UpdateRouteValidationBody> => async (
  ctx,
  request,
  response
) => {
  const client = getInternalSavedObjectsClient();
  const { id, ...rest } = request.body;
  await client.update(TEXT_OBJECT.type, id, {
    userId: username,
    ...rest,
  });
  return response.noContent();
};

export const registerUpdateRoute = ({
  router,
  authc,
  getInternalSavedObjectsClient,
}: RouteDependencies) => {
  router.put(
    { path: `${APP.apiPathBase}/text_objects/update`, validate: routeValidation },
    withCurrentUsername<AuthcHandlerArgs>({
      authc,
      passThroughDeps: { getInternalSavedObjectsClient },
      handlerFactory: createHandler,
    })
  );
};
