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

type UpdateRouteValidation = TypeOf<typeof routeValidation>;

export const createHandler = ({
  getInternalSavedObjectsClient,
  username,
}: AuthcHandlerArgs): RequestHandler<unknown, unknown, UpdateRouteValidation> => async (
  ctx,
  request,
  response
) => {
  const client = getInternalSavedObjectsClient();
  const { id, ...rest } = request.body;
  const result = await client.update(TEXT_OBJECT.type, id, {
    userId: username,
    ...rest,
  });
  return response.ok({ body: result });
};

export const registerUpdateRoute = ({
  router,
  authc,
  getInternalSavedObjectsClient,
}: RouteDependencies) => {
  router.post(
    { path: `${APP.apiPathBase}/text_objects/update`, validate: routeValidation },
    withCurrentUsername({
      authc,
      passThroughDeps: { getInternalSavedObjectsClient },
      userHandler: createHandler,
    })
  );
};
